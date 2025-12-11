import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Initialize MCP client
let mcpClient;
async function initializeMCP() {
    // Use environment variable for weather server path, default to local path
    const weatherServerPath = process.env.WEATHER_SERVER_PATH || '../weather/build/index.js';

    const transport = new StdioClientTransport({
        command: 'node',
        args: [weatherServerPath]
    });

    mcpClient = new Client({
        name: 'chatbot-backend',
        version: '1.0.0'
    }, {
        capabilities: {}
    });

    await mcpClient.connect(transport);
    console.log('MCP server connected');
}

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;
    console.log("req.body", req.body);

    try {
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
