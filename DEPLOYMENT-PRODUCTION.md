# Production Deployment Guide

## Architecture Overview

### Service Communication
```
Internet → React App (Port 3000) → Middleware (Port 3001) → Weather MCP (stdio)
                                         ↓
                                   Claude API
```

**Important**: Weather server MUST be bundled with middleware because it uses stdio communication (not HTTP).

## Separate Deployment Strategy

### 1. Middleware + Weather (Deploy Together)
**File**: `mcp-middleware/Dockerfile.production`

**Deploy to**: Render, Railway, or Fly.io

#### Render Deployment
```bash
# 1. Push code to GitHub

# 2. Go to Render Dashboard
# 3. Click "New +" → "Web Service"
# 4. Connect GitHub repo
# 5. Configure:
#    Name: mcp-middleware
#    Root Directory: .
#    Environment: Docker
#    Docker Build Context Path: .
#    Dockerfile Path: mcp-middleware/Dockerfile.production
#    Instance Type: Free

# 6. Environment Variables:
#    ANTHROPIC_API_KEY=your_key_here
#    MCP_SERVER_PATH=./weather/build/index.js

# 7. Click "Create Web Service"
# 8. Copy the URL: https://mcp-middleware-xyz.onrender.com
```

#### Railway Deployment
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login and create project
railway login
railway init

# 3. Set Dockerfile
railway up --dockerfile mcp-middleware/Dockerfile.production

# 4. Add environment variables
railway variables set ANTHROPIC_API_KEY=your_key

# 5. Deploy
railway up
```

#### Fly.io Deployment
```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch app
cd /path/to/MCP
fly launch --name mcp-middleware --dockerfile mcp-middleware/Dockerfile.production --no-deploy

# 4. Set secrets
fly secrets set ANTHROPIC_API_KEY=your_key

# 5. Deploy
fly deploy --dockerfile mcp-middleware/Dockerfile.production

# 6. Get URL
fly status
```

---

### 2. React App (Deploy Separately)
**File**: `react-app/Dockerfile.production`

**Deploy to**: Vercel (recommended), Render, or Netlify

#### Vercel Deployment (Recommended)
```bash
# 1. Go to https://vercel.com
# 2. Click "Add New Project"
# 3. Import GitHub repository
# 4. Configure:
#    Framework Preset: Next.js
#    Root Directory: react-app
#    Build Command: npm run build
#    Output Directory: .next

# 5. Environment Variables:
#    NEXT_PUBLIC_MCP_MIDDLEWARE_URL=https://mcp-middleware-xyz.onrender.com

# 6. Deploy
```

#### Render Deployment (Static or Docker)
```bash
# Option A: Static Site
# 1. New → Static Site
# 2. Build Command: npm run build
# 3. Publish Directory: .next

# Option B: Docker
# 1. New → Web Service
# 2. Environment: Docker
# 3. Dockerfile Path: react-app/Dockerfile.production
# 4. Port: 3000
```

---

## Environment Variables Summary

### Middleware Service
| Variable | Value | Required |
|----------|-------|----------|
| `ANTHROPIC_API_KEY` | Your API key | Yes |
| `MCP_SERVER_PATH` | `./weather/build/index.js` | Yes |
| `PORT` | `3001` | No (default) |
| `NODE_ENV` | `production` | No |

### React App Service
| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_MCP_MIDDLEWARE_URL` | Your middleware URL | Yes |
| `NODE_ENV` | `production` | No |

---

## Update CORS After Deployment

After deploying, update CORS in `mcp-middleware/index.js`:

```javascript
app.use((req, res, next) => {
    // Replace with your actual deployed frontend URL
    const allowedOrigins = [
        'http://localhost:3000',
        'https://your-app.vercel.app',
        'https://your-app.onrender.com'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});
```

---

## Testing Production Builds Locally

```bash
# Build and run production builds locally
docker-compose -f docker-compose.production.yml up --build

# Test:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Health: http://localhost:3001/health
```

---

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Deploy middleware with weather bundled (Render/Railway/Fly.io)
- [ ] Get middleware URL and test `/health` endpoint
- [ ] Deploy frontend (Vercel/Render)
- [ ] Set `NEXT_PUBLIC_MCP_MIDDLEWARE_URL` to middleware URL
- [ ] Update CORS in middleware to allow frontend URL
- [ ] Test end-to-end: Ask for weather in the UI
- [ ] Monitor logs for errors
- [ ] Set up environment variables on hosting platform
- [ ] Enable health checks on both services

---

## Cost Optimization

### Free Tier Strategy
| Service | Platform | Cost | Notes |
|---------|----------|------|-------|
| Frontend | Vercel | $0 | Unlimited |
| Backend+Weather | Render | $0 | 750 hrs/mo (always on for 1 service) |
| **Total** | | **$0/month** | |

### Paid Tier (No Cold Starts)
| Service | Platform | Cost | Notes |
|---------|----------|------|-------|
| Frontend | Vercel | $0 | Still free |
| Backend+Weather | Render Starter | $7/mo | No cold starts |
| **Total** | | **$7/month** | |

---

## Troubleshooting

### Middleware won't start
- Check ANTHROPIC_API_KEY is set
- Check weather server path: `./weather/build/index.js`
- View logs on hosting platform

### Frontend can't connect to backend
- Check NEXT_PUBLIC_MCP_MIDDLEWARE_URL is correct
- Check CORS includes your frontend URL
- Use browser DevTools → Network tab

### Weather tool not working
- Weather server MUST be bundled with middleware (stdio communication)
- Check middleware logs for "MCP server connected"
- Check weather server built successfully in Docker

### Cold starts (Render free tier)
- First request after 15min takes ~30s
- Use paid tier ($7/mo) for instant response
- Or use a ping service to keep it awake

---

## Why Can't Weather Be Deployed Separately?

The weather MCP server uses **stdio** (Standard Input/Output) for communication, not HTTP. This means:

❌ **Cannot work**: Middleware on Render → HTTP → Weather on another Render instance
✅ **Must work**: Middleware contains Weather → stdio communication in same process

This is why `Dockerfile.production` bundles both services together.

---

## Advanced: Custom Domain

### Vercel (Frontend)
```bash
# 1. Go to Project Settings → Domains
# 2. Add your domain: app.yourdomain.com
# 3. Update DNS with provided CNAME
```

### Render (Backend)
```bash
# 1. Go to Service → Settings → Custom Domain
# 2. Add: api.yourdomain.com
# 3. Update DNS with provided CNAME
```

Then update CORS and environment variables accordingly.
