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
│  │  2. Lists available MCP tools                         │ │
│  │  3. Sends to Claude API with tools                    │ │
│  │  4. Executes tool calls via MCP client                │ │
│  │  5. Returns final response                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────┐              ┌──────────────────────┐   │
│  │  MCP Client  │─────stdio───▶│  Weather MCP Server  │   │
│  │              │              │  (bundled inside)    │   │
│  └──────────────┘              └──────────────────────┘   │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE API                               │
│              (Anthropic Cloud)                              │
└─────────────────────────────────────────────────────────────┘
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
  2. Get tools from MCP (stdio)
  3. Call Claude API with tools
  4. If tool_use: Execute via MCP
  5. Get final response
  6. Stream back to React
```

### 3. Tool Execution (Weather Example)
```
Claude API → "tool_use: get_forecast"
     ↓
Middleware → MCP Client (stdio) → Weather Server
     ↓
Weather Server → Returns forecast data
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
┌─────────────────────────────────────┐
│     Docker Compose                  │
│  ┌─────────┐      ┌──────────────┐ │
│  │ React   │      │  Middleware  │ │
│  │ App     │─────▶│  + Weather   │ │
│  │ :3000   │      │  :3001       │ │
│  └─────────┘      └──────────────┘ │
└─────────────────────────────────────┘
```

### Production (Separate Services)
```
┌────────────┐         ┌─────────────────────┐
│   Vercel   │         │      Render         │
│            │         │                     │
│  React App │────────▶│   Middleware        │
│  (Next.js) │  HTTPS  │   + Weather         │
│            │         │   (stdio bundled)   │
└────────────┘         └─────────────────────┘
```

### Why Weather Must Be Bundled

❌ **Cannot work**:
```
Render Instance 1     HTTP      Render Instance 2
┌────────────┐   ────────▶   ┌─────────────┐
│ Middleware │               │   Weather   │
└────────────┘               └─────────────┘
       stdio communication doesn't work over network!
```

✅ **Must work**:
```
Render Instance 1
┌─────────────────────────────┐
│  Middleware                 │
│    │                        │
│    │ stdio (in-process)     │
│    ▼                        │
│  Weather Server             │
└─────────────────────────────┘
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
| Middleware | Node.js, Express, Anthropic SDK | 3001 |
| MCP Client | @modelcontextprotocol/sdk | - |
| Weather Server | TypeScript, Zod, MCP SDK | stdio |
| AI Model | Claude Sonnet 4 | - |

## Environment Variables

### React App
- `NEXT_PUBLIC_API_URL` - Middleware URL

### Middleware
- `ANTHROPIC_API_KEY` - Claude API key
- `WEATHER_SERVER_PATH` - Path to weather server
- `PORT` - Server port (default 3001)

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
