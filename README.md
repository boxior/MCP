# MCP Chatbot Project

A full-stack chatbot application using Model Context Protocol (MCP) to connect Claude AI with custom tools and services.

## Project Structure

```
MCP/
├── react-app/              # Next.js chatbot UI
├── mcp-middleware/         # Express server connecting MCP tools to Claude API
├── weather/                # MCP weather server (example tool)
└── mcp-client-typescript/  # TypeScript MCP client
```

## Features

- **React Chat UI** - Professional chatbot interface with real-time streaming
- **MCP Integration** - Connects Claude AI to custom tools via Model Context Protocol
- **Weather Tool** - Example MCP tool for fetching weather data
- **TypeScript** - Fully typed codebase for type safety

## Quick Start

### 1. Setup Environment

Create `.env` file in `mcp-middleware/`:
```bash
ANTHROPIC_API_KEY=your_api_key_here
```

### 2. Install Dependencies

```bash
# Install middleware dependencies
cd mcp-middleware
npm install

# Install React app dependencies
cd ../react-app
npm install
```

### 3. Run the Application

**Terminal 1 - Start middleware server:**
```bash
cd mcp-middleware
npm start
# Runs on http://localhost:3001
```

**Terminal 2 - Start React app:**
```bash
cd react-app
npm run dev
# Runs on http://localhost:3000
```

## How It Works

1. **User Input** → React chatbot UI sends messages to middleware
2. **Middleware** → Proxies requests to Claude API with MCP tools
3. **Tool Execution** → Claude calls MCP tools (e.g., weather) when needed
4. **Response** → Results stream back to the UI in real-time

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, @chatscope/chat-ui-kit-react
- **Backend**: Node.js, Express, Anthropic SDK
- **MCP**: @modelcontextprotocol/sdk
- **AI**: Claude Sonnet 4

## API Endpoints

- `POST /api/chat` - Main chat endpoint (port 3001)

## Components

- `Chatbot.tsx` - Basic chatbot component
- `ChatbotUi.tsx` - Enhanced UI with professional chat interface

## Deployment

For production deployment to cloud platforms:
- See `DEPLOYMENT-PRODUCTION.md` for detailed deployment guide
- See `ARCHITECTURE.md` for system architecture overview

**Quick Deploy**:
- Frontend (Vercel): Free, unlimited
- Backend (Render): Free, 750 hrs/month
- Total: $0/month
