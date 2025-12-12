# MCP Chatbot Project

A full-stack chatbot application using Model Context Protocol (MCP) to connect Claude AI with custom tools and services. Built with a microservices architecture for independent deployment and scaling.

## Project Structure

```
MCP/
├── react-app/              # Next.js chatbot UI (Port 3000)
├── mcp-middleware/         # Express server connecting to Claude API (Port 3001)
├── weather/                # HTTP MCP weather server with auth (Port 3002)
└── mcp-client-typescript/  # TypeScript MCP client (legacy)
```

## Architecture

**3-Service Architecture:**
```
[React App] → [Middleware] → [Weather MCP Server]
   :3000         :3001              :3002
                              (Bearer Auth)
```

## Features

- **React Chat UI** - Professional chatbot interface with real-time streaming
- **MCP Integration** - Connects Claude AI to custom tools via HTTP MCP transport
- **Weather MCP Tool** - Standalone HTTP MCP server with Bearer token authentication
- **Microservices** - Each service can be deployed and scaled independently
- **TypeScript** - Fully typed codebase for type safety

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your Anthropic API key to .env
# ANTHROPIC_API_KEY=your_key_here

# 3. Start all services
docker-compose up --build

# Access:
# - Frontend: http://localhost:3000
# - Middleware: http://localhost:3001
# - Weather MCP: http://localhost:3002
```

### Option 2: Manual Setup

**Terminal 1 - Weather MCP Server:**
```bash
cd weather
npm install
npm run b:s
# Runs on http://localhost:3002
```

**Terminal 2 - Middleware:**
```bash
cd mcp-middleware
npm install

# Create .env file
echo "ANTHROPIC_API_KEY=your_key_here" > .env
echo "MCP_SERVER_URL=http://localhost:3002/mcp" >> .env
echo "MCP_SERVER_API_KEY=demo-api-key-123" >> .env

npm start
# Runs on http://localhost:3001
```

**Terminal 3 - React App:**
```bash
cd react-app
npm install
npm run dev
# Runs on http://localhost:3000
```

## How It Works

1. **User Input** → React chatbot UI sends messages to middleware
2. **Middleware** → Connects to Claude API and Weather MCP server via HTTP
3. **Tool Execution** → Claude calls MCP tools (weather with Bearer auth)
4. **Response** → Results stream back to the UI in real-time

## Tech Stack

| Service | Technology |
|---------|-----------|
| **Frontend** | Next.js, React, TypeScript, @chatscope/chat-ui-kit-react |
| **Middleware** | Node.js, Express, Anthropic SDK, MCP HTTP Client |
| **Weather MCP** | TypeScript, Express, Zod, MCP SDK, HTTP Transport |
| **AI Model** | Claude Sonnet 4 |

## API Endpoints

### Middleware (Port 3001)
- `POST /api/chat` - Main chat endpoint
- `GET /health` - Health check

### Weather MCP (Port 3002)
- `POST /mcp` - MCP endpoint (requires Bearer auth)
- `GET /health` - Health check

## Key Files

- `docker-compose.yml` - Development environment setup
- `docker-compose.production.yml` - Production environment testing
- `ARCHITECTURE.md` - Detailed system architecture
- `DEPLOYMENT.md` - Deployment guide for all platforms
- `.env.example` - Environment variables template

## Deployment

**3 Separate Services to Deploy:**
1. Weather MCP Server (Port 3002)
2. Middleware (Port 3001)
3. React App (Port 3000)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment guides:
- Render (Free tier available)
- Railway
- Fly.io
- Local Docker

**Free Tier Strategy:**
- Frontend: Vercel (unlimited free)
- Middleware: Render (750 hrs = always on)
- Weather MCP: Render (750 hrs = always on)
- **Total: $0/month** (with cold starts)
