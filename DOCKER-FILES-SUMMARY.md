# Docker Files Summary

## Overview

You now have **two separate sets** of Docker configurations:

1. **Development** - For local testing
2. **Production** - For cloud deployment

## File Structure

```
MCP/
├── 📄 docker-compose.yml              # Local development
├── 📄 docker-compose.production.yml   # Production testing
│
├── mcp-middleware/
│   ├── 📄 Dockerfile                  # Development
│   ├── 📄 Dockerfile.production       # Production (includes weather)
│   └── 📄 .dockerignore
│
├── react-app/
│   ├── 📄 Dockerfile                  # Development
│   ├── 📄 Dockerfile.production       # Production
│   └── 📄 .dockerignore
│
└── weather/
    ├── 📄 Dockerfile                  # Development only
    └── 📄 .dockerignore
```

---

## Development Files

### When to Use
- Local testing on your machine
- Debugging
- Development workflow

### docker-compose.yml
```bash
# Run all services locally
docker-compose up --build

# Access:
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
```

**Services:**
- `middleware` - Backend with weather bundled
- `react-app` - Frontend

---

## Production Files

### When to Use
- Deploying to Render, Railway, Fly.io, etc.
- Production environment
- Testing production builds locally

### Dockerfile.production Files

#### 1. mcp-middleware/Dockerfile.production
**Purpose**: Deploy backend + weather together

**Features:**
- Multi-stage build for smaller image
- Bundles weather MCP server (stdio requirement)
- Production-optimized dependencies
- Health checks included
- Non-root user

**Deploy to:** Render, Railway, Fly.io

**Build command:**
```bash
docker build -f mcp-middleware/Dockerfile.production -t mcp-middleware-prod .
```

#### 2. react-app/Dockerfile.production
**Purpose**: Deploy frontend separately

**Features:**
- Multi-stage build
- Next.js standalone output
- Optimized for production
- Health checks included
- Non-root user (nextjs:nodejs)

**Deploy to:** Vercel (recommended), Render, Netlify

**Build command:**
```bash
cd react-app
docker build -f Dockerfile.production -t react-app-prod .
```

### docker-compose.production.yml
**Purpose**: Test production builds locally before deploying

```bash
# Build and run production builds locally
docker-compose -f docker-compose.production.yml up --build

# Access:
Frontend:  http://localhost:3000
Backend:   http://localhost:3001
Health:    http://localhost:3001/health
```

---

## Key Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Image size | Larger | Optimized/smaller |
| Dependencies | All deps | Only production deps |
| Build stages | Single | Multi-stage |
| Health checks | No | Yes |
| User | root | Non-root (security) |
| Optimization | Fast build | Small size |
| Hot reload | No | No |

---

## Deployment Architecture

### Separate Services (WILL WORK ✅)

```
┌─────────────┐         ┌──────────────────────┐
│   Vercel    │  HTTPS  │      Render          │
│             │─────────▶│                      │
│  React App  │         │   Middleware         │
│             │         │   + Weather (stdio)  │
└─────────────┘         └──────────────────────┘
   Port 3000                  Port 3001
```

**Why this works:**
- Frontend → Backend: HTTP/HTTPS ✅
- Backend → Weather: stdio (same container) ✅
- Backend → Claude API: HTTPS ✅

### Why Weather Can't Be Separate (WON'T WORK ❌)

```
┌────────────┐         ┌─────────┐         ┌─────────┐
│  Middleware│─────────│ Network │─────────│ Weather │
└────────────┘  stdio  └─────────┘  stdio  └─────────┘
                  ❌                   ❌
     stdio only works within same process!
```

**Solution:** Weather MUST be bundled with middleware (already done in Dockerfile.production)

---

## Deployment Instructions

### For Cloud Deployment (Render Example)

#### 1. Deploy Middleware + Weather
```bash
# On Render:
1. New Web Service
2. Connect GitHub repo
3. Settings:
   - Root Directory: .
   - Dockerfile Path: mcp-middleware/Dockerfile.production
   - Docker Build Context: .
4. Environment Variables:
   - ANTHROPIC_API_KEY=your_key
   - MCP_SERVER_PATH=./weather/build/index.js
5. Deploy
6. Copy URL: https://mcp-middleware-xyz.onrender.com
```

#### 2. Deploy Frontend
```bash
# On Vercel:
1. Import GitHub repo
2. Root Directory: react-app
3. Environment Variables:
   - NEXT_PUBLIC_MCP_MIDDLEWARE_URL=https://mcp-middleware-xyz.onrender.com
4. Deploy
```

#### 3. Update CORS
Update `mcp-middleware/index.js`:
```javascript
res.header('Access-Control-Allow-Origin', 'https://your-app.vercel.app');
```

Then redeploy middleware.

---

## Testing Locally

### Development Build
```bash
docker-compose up --build
```

### Production Build
```bash
docker-compose -f docker-compose.production.yml up --build
```

### Health Checks
```bash
# Middleware health
curl http://localhost:3001/health
# Expected: {"status":"ok","message":"MCP middleware is healthy"}

# Frontend
curl http://localhost:3000
# Expected: 200 OK
```

---

## Important Notes

1. **Weather Server Location**
   - Development: `../weather/build/index.js`
   - Production: `./weather/build/index.js`
   - Controlled by `MCP_SERVER_PATH` env var

2. **API URL**
   - Development: `http://localhost:3001`
   - Production: Set via `NEXT_PUBLIC_MCP_MIDDLEWARE_URL`

3. **CORS**
   - Development: `http://localhost:3000`
   - Production: Update to your deployed frontend URL

4. **Environment Variables**
   - Development: `.env` file
   - Production: Set in hosting platform dashboard

---

## Troubleshooting

### "Connection closed" error
- Weather server not found
- Check `MCP_SERVER_PATH` is correct
- Check weather built successfully (look for build/ folder)

### "Cannot connect to backend"
- Check CORS settings
- Check `NEXT_PUBLIC_MCP_MIDDLEWARE_URL` is set correctly
- Check both services are running

### "Health check failed"
- Check logs: `docker-compose logs middleware`
- Check environment variables are set
- Check port 3001 is not in use

---

## Next Steps

1. ✅ Test locally with production builds
2. ✅ Commit and push to GitHub
3. 🚀 Deploy to cloud platforms
4. 🔧 Update environment variables
5. ✅ Test end-to-end in production

See `DEPLOYMENT-PRODUCTION.md` for detailed deployment steps.
