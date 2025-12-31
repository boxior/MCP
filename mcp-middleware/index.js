import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import cors from 'cors';
import { PREFILTER_CONFIG, checkIfWeatherQuery, generateRejectionMessage } from './preFilter.js';

const app = express();
app.use(express.json());
app.use(cors())

// Initialize MCP client
let mcpClient;
async function initializeMCP() {
    // Use environment variable for weather server URL
    const weatherServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp';
    const weatherApiKey = process.env.MCP_SERVER_API_KEY || 'demo-api-key-123';

    console.log('Connecting to MCP server at:', weatherServerUrl);
    console.log('Using API key:', weatherApiKey ? '***' + weatherApiKey.slice(-4) : 'none');

    const transport = new StreamableHTTPClientTransport(weatherServerUrl, {
        requestInit: {
            headers: {
                'Authorization': `Bearer ${weatherApiKey}`
            }
        }
    });

    mcpClient = new Client({
        name: 'chatbot-backend',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    await mcpClient.connect(transport);
    console.log('MCP server connected via HTTP to:', weatherServerUrl);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Validate API key is set
if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set!');
    console.error('Please create a .env file in the mcp-middleware directory with ANTHROPIC_API_KEY=your-key');
    process.exit(1);
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;
    console.log("req.body", req.body);

    try {
        // STEP 1: Extract last user message for pre-filtering
        const lastUserMessage = messages
            .filter(m => m.role === 'user')
            .pop();

        if (!lastUserMessage) {
            throw new Error('No user message found');
        }

        // STEP 2: Check if it's a weather query (only if pre-filter is enabled)
        if (PREFILTER_CONFIG.ENABLED) {
            const classification = await checkIfWeatherQuery(anthropic, lastUserMessage.content);

            console.log('Query classification:', {
                query: lastUserMessage.content,
                isWeather: classification.isWeatherQuery,
                confidence: classification.confidence
            });

            // STEP 3: If not weather-related, return rejection message
            if (!classification.isWeatherQuery) {
                // Use same streaming format for consistency
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const rejectionMessage = generateRejectionMessage();
                const chunkSize = PREFILTER_CONFIG.REJECTION_CHUNK_SIZE;

                // Stream rejection message in chunks (matches existing format)
                for (let i = 0; i < rejectionMessage.length; i += chunkSize) {
                    const chunk = rejectionMessage.slice(i, i + chunkSize);
                    res.write(`data: ${JSON.stringify({ delta: { text: chunk } })}\n\n`);
                }

                res.write(`data: [DONE]\n\n`);
                res.end();
                return;  // EXIT HERE - SAVE TOKENS!
            }
        }

        // STEP 4: Weather query - continue with existing flow
        // Get available tools from MCP server
        const toolsList = await mcpClient.listTools();
        console.log('Available tools:', toolsList.tools.map(t => t.name));

        // Convert MCP tools to Anthropic format
        const tools = toolsList.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema
        }));

        // Stream response
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let currentMessages = [...messages];
        let shouldContinue = true;

        while (shouldContinue) {
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: currentMessages,
                tools: tools
            });

            console.log('Response stop_reason:', response.stop_reason);

            // Check if Claude wants to use tools
            if (response.stop_reason === 'tool_use') {
                // Add assistant's response to messages
                currentMessages.push({
                    role: 'assistant',
                    content: response.content
                });

                // Execute all tool calls
                const toolResults = [];
                for (const block of response.content) {
                    if (block.type === 'tool_use') {
                        console.log(`Executing tool: ${block.name}`, block.input);

                        try {
                            const result = await mcpClient.callTool({
                                name: block.name,
                                arguments: block.input
                            });

                            console.log('Tool result:', result);
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: JSON.stringify(result.content)
                            });
                        } catch (toolError) {
                            console.error('Tool execution error:', toolError);
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: JSON.stringify({ error: toolError.message }),
                                is_error: true
                            });
                        }
                    }
                }

                // Add tool results to messages
                currentMessages.push({
                    role: 'user',
                    content: toolResults
                });

                // Continue the loop to get final response
            } else {
                // Stream the final text response
                for (const block of response.content) {
                    if (block.type === 'text') {
                        // Send text in chunks to simulate streaming
                        const text = block.text;
                        const chunkSize = 5;
                        for (let i = 0; i < text.length; i += chunkSize) {
                            const chunk = text.slice(i, i + chunkSize);
                            res.write(`data: ${JSON.stringify({ delta: { text: chunk } })}\n\n`);
                        }
                    }
                }

                res.write(`data: [DONE]\n\n`);
                res.end();
                shouldContinue = false;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'MCP middleware is healthy' });
});

// Start server
initializeMCP().then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Backend running on port ${PORT}`);
    });
});
