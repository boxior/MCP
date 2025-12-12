# MCP Chatbot Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   REACT APP (Next.js)                       │
│                     Port 3000                               │
│  Components: Chatbot.tsx, ChatbotUi.tsx                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST /api/chat
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP MIDDLEWARE (Express)                       │
│                     Port 3001                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1. Receives chat messages                            │ │
│  │  2. Lists available MCP tools via HTTP                │ │
│  │  3. Sends to Claude API with tools                    │ │
│  │  4. Executes tool calls via MCP HTTP client           │ │
│  │  5. Returns final response                            │ │
│  └───────────────────────────────────────────────────────┘ │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTPS                    │ HTTP + Auth Header
          ▼                          ▼
┌──────────────────────┐   ┌─────────────────────────────────┐
│    CLAUDE API        │   │   WEATHER MCP SERVER            │
│ (Anthropic Cloud)    │   │   (HTTP Standalone Service)     │
└──────────────────────┘   │   Port 3002                     │
                           │   Authorization: Bearer token   │
                           └─────────────────────────────────┘
```

## Communication Flow

### 1. User Sends Message
```
User → React App → POST /api/chat → Middleware
```

### 2. Middleware Processes Request
```
Middleware:
  1. Receive messages
  2. Get tools from MCP (HTTP)
  3. Call Claude API with tools
  4. If tool_use: Execute via MCP HTTP client
  5. Get final response
  6. Stream back to React
```

### 3. Tool Execution (Weather Example)
```
Claude API → "tool_use: get_forecast"
     ↓
Middleware → MCP HTTP Client (with Auth header) → Weather Server
     ↓
Weather Server → Validates auth → Returns forecast data
     ↓
Middleware → Sends tool result to Claude
     ↓
Claude → Generates natural language response
     ↓
Middleware → Streams response to React App
```

## Deployment Models

### Local Development
```
┌───────────────────────────────────────────────┐
│           Docker Compose (3 services)         │
│  ┌─────────┐   ┌──────────────┐  ┌─────────┐│
│  │ React   │   │  Middleware  │  │ Weather ││
│  │ App     │──▶│  :3001       │─▶│ MCP     ││
│  │ :3000   │   │              │  │ :3002   ││
│  └─────────┘   └──────────────┘  └─────────┘│
│                      │ HTTP + Auth             │
│                      └────────────────────────┘
└───────────────────────────────────────────────┘
```

### Production (3 Separate Services)
```
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│   Vercel   │    │    Render    │    │    Render    │
│            │    │              │    │              │
│  React App │───▶│  Middleware  │───▶│   Weather    │
│  (Next.js) │    │  :3001       │    │   MCP :3002  │
│            │    │              │    │   + Auth     │
└────────────┘    └──────────────┘    └──────────────┘
     HTTPS              HTTPS              HTTP + Bearer Token
```

### New Architecture Benefits

✅ **Advantages of HTTP Transport**:
```
1. Services can be deployed independently
2. Each service scales independently
3. Weather MCP server can be reused by other clients
4. Easier to monitor and debug
5. Better security with authorization headers
```

✅ **How it works now**:
```
┌──────────────────┐      HTTP + Auth      ┌──────────────────┐
│   Middleware     │────────────────────────▶│  Weather MCP    │
│   (Render)       │  Bearer token           │  (Render)       │
└──────────────────┘                        └──────────────────┘
     Separate containers, HTTP communication over network
```

## Files Structure

### Development Files
- `Dockerfile` - Development Docker images
- `docker-compose.yml` - Local development setup
- `.dockerignore` - Files to exclude from Docker

### Production Files
- `Dockerfile.production` - Optimized production images
- `docker-compose.production.yml` - Production testing
- `DEPLOYMENT-PRODUCTION.md` - Production deployment guide

## Key Technologies

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend | Next.js, React, TypeScript | 3000 |
| Middleware | Node.js, Express, Anthropic SDK, MCP HTTP Client | 3001 |
| Weather MCP | TypeScript, Express, Zod, MCP SDK | 3002 |
| AI Model | Claude Sonnet 4 | - |

## Environment Variables

### React App
- `NEXT_PUBLIC_MCP_MIDDLEWARE_URL` - Middleware URL (e.g., https://middleware.onrender.com)

### Middleware
- `ANTHROPIC_API_KEY` - Claude API key
- `MCP_SERVER_URL` - Weather MCP server URL (e.g., http://weather:3002/mcp or https://weather-mcp.onrender.com/mcp)
- `MCP_SERVER_API_KEY` - Bearer token for weather MCP authentication (default: demo-api-key-123)
- `PORT` - Server port (default 3001)

### Weather MCP Server
- `PORT` - Server port (default 3002)
- `NODE_ENV` - Environment (development/production)

## Security Considerations

1. **API Key**: Never commit `.env` files
2. **CORS**: Whitelist only your frontend domains
3. **Environment Variables**: Use platform secrets management
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Consider adding rate limits
6. **Input Validation**: Validate all user inputs

## Monitoring

### Health Checks
- Frontend: `http://localhost:3000/`
- Backend: `http://localhost:3001/health`

### Logs
```bash
# Local
docker-compose logs -f middleware
docker-compose logs -f react-app

# Production (Render)
# View in dashboard → Logs tab
```

## Scaling Considerations

### Free Tier Limitations
- Render: 750 hours/month (sleeps after 15min)
- Vercel: Unlimited frontend hosting
- Cold start time: ~30 seconds

### Paid Tier Benefits
- No cold starts
- Better performance
- More concurrent connections
- Longer timeout limits

## Troubleshooting Guide

See `DEPLOYMENT-PRODUCTION.md` for detailed troubleshooting steps.
