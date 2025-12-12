# Dockerfile Selection Guide

This project has multiple Dockerfiles for different deployment scenarios. Use this guide to choose the right one.

## Quick Reference

| Scenario | Weather MCP | Middleware | React App |
|----------|-------------|------------|-----------|
| **Local Development** | `weather/Dockerfile` | `mcp-middleware/Dockerfile` | `react-app/Dockerfile` |
| **Local Production Test** | `weather/Dockerfile.production` | `mcp-middleware/Dockerfile.production` | `react-app/Dockerfile.production` |
| **Render Deployment** | `Dockerfile.weather.production` | `Dockerfile.middleware.production` | `Dockerfile.react-app.production` |
| **Railway/Fly.io** | `weather/Dockerfile.production` | `mcp-middleware/Dockerfile.production` | `react-app/Dockerfile.production` |

## Detailed Explanation

### Local Development (docker-compose.yml)
Uses simple Dockerfiles in each service directory:
- `weather/Dockerfile`
- `mcp-middleware/Dockerfile`
- `react-app/Dockerfile`

**Start**: `docker-compose up --build`

### Local Production Testing (docker-compose.production.yml)
Uses production-optimized Dockerfiles in each service directory:
- `weather/Dockerfile.production`
- `mcp-middleware/Dockerfile.production`
- `react-app/Dockerfile.production`

**Start**: `docker-compose -f docker-compose.production.yml up --build`

### Render Deployment
**Problem**: Render builds from the repository root and cannot access files in subdirectories easily.

**Solution**: Use root-level Dockerfiles that reference subdirectories:
- `Dockerfile.weather.production` (at repo root)
- `Dockerfile.middleware.production` (at repo root)
- `Dockerfile.react-app.production` (at repo root)

**Render Settings**:
```
Root Directory: (leave blank)
Dockerfile Path: Dockerfile.weather.production
```

### Railway/Fly.io Deployment
These platforms support setting the build context to subdirectories, so use:
- `weather/Dockerfile.production`
- `mcp-middleware/Dockerfile.production`
- `react-app/Dockerfile.production`

**Railway**: Automatically detects the correct context
**Fly.io**: Use `cd` into directory before `fly launch`

## File Structure

```
MCP/
├── Dockerfile.weather.production      # Render: Weather MCP
├── Dockerfile.middleware.production   # Render: Middleware
├── Dockerfile.react-app.production    # Render: React App
├── docker-compose.yml                 # Local dev
├── docker-compose.production.yml      # Local prod test
├── weather/
│   ├── Dockerfile                     # Dev
│   └── Dockerfile.production          # Railway/Fly.io
├── mcp-middleware/
│   ├── Dockerfile                     # Dev
│   └── Dockerfile.production          # Railway/Fly.io
└── react-app/
    ├── Dockerfile                     # Dev
    └── Dockerfile.production          # Railway/Fly.io
```

## Why Multiple Dockerfiles?

1. **Root-level Dockerfiles** (`Dockerfile.*.production`):
   - Required for Render
   - Build context = repo root
   - Use `COPY weather/...` syntax

2. **Service-level Dockerfiles** (`*/Dockerfile.production`):
   - For platforms supporting subdirectory builds
   - Build context = service directory
   - Use `COPY . .` syntax

3. **Development Dockerfiles** (`*/Dockerfile`):
   - Optimized for fast rebuilds
   - Less security hardening
   - May include debug tools

## Testing Locally

Before deploying to Render, test the root-level Dockerfiles:

```bash
# Test weather MCP
docker build -f Dockerfile.weather.production -t weather-test .
docker run -p 3002:3002 -e PORT=3002 weather-test

# Test middleware
docker build -f Dockerfile.middleware.production -t middleware-test .
docker run -p 3001:3001 \
  -e ANTHROPIC_API_KEY=your_key \
  -e MCP_SERVER_URL=http://localhost:3002/mcp \
  middleware-test

# Test React app
docker build -f Dockerfile.react-app.production \
  --build-arg NEXT_PUBLIC_MCP_MIDDLEWARE_URL=http://localhost:3001 \
  -t react-test .
docker run -p 3000:3000 react-test
```

## Common Issues

### Issue: "File not found" during Render build
**Solution**: Make sure you're using the root-level Dockerfile (`Dockerfile.*.production`)

### Issue: Environment variables not working
**Solution**: Check that you've set them in Render dashboard under "Environment" tab

### Issue: Services can't communicate
**Solution**: Use the full Render URLs (e.g., `https://weather-mcp.onrender.com/mcp`) not localhost
