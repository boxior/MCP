# Deployment Guide - 3-Service Architecture

This guide covers deploying all three services separately:
1. **Weather MCP Server** (Port 3002)
2. **Middleware** (Port 3001)
3. **React App** (Port 3000)

---

## Architecture Overview

```
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│   Vercel   │    │    Render    │    │    Render    │
│  React App │───▶│  Middleware  │───▶│   Weather    │
│            │    │              │    │   MCP        │
└────────────┘    └──────────────┘    └──────────────┘
```

**Key Points:**
- All 3 services are deployed independently
- Weather MCP uses HTTP transport with Bearer token authentication
- Middleware connects to Weather MCP via HTTP (not stdio)
- Each service can scale independently

---

## Option 1: Render (Recommended for Free Tier)

### Prerequisites
- GitHub account with your MCP repository
- Render account (sign up at https://render.com)
- Anthropic API key

### Step 1: Deploy Weather MCP Server

1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `weather-mcp-server`
   - **Root Directory**: `weather`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile.production`
   - **Plan**: `Free`
5. Add Environment Variables:
   - Key: `PORT`
   - Value: `3002`
6. Click **Create Web Service**
7. **Note the URL** (e.g., `https://weather-mcp-server.onrender.com`)

### Step 2: Deploy Middleware

1. Click **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `mcp-middleware`
   - **Root Directory**: `.` (root)
   - **Environment**: `Docker`
   - **Dockerfile Path**: `mcp-middleware/Dockerfile.production`
   - **Plan**: `Free`
4. Add Environment Variables:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key
   - Key: `MCP_SERVER_URL`
   - Value: `https://weather-mcp-server.onrender.com/mcp` (from Step 1)
   - Key: `MCP_SERVER_API_KEY`
   - Value: `demo-api-key-123` (or your custom token)
5. Click **Create Web Service**
6. **Note the URL** (e.g., `https://mcp-middleware.onrender.com`)

### Step 3: Deploy Frontend (React App)

**Option A: Vercel (Best for Next.js)**

1. Go to https://vercel.com
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `react-app`
   - **Build Command**: `npm run build`
5. Add Environment Variable:
   - Key: `NEXT_PUBLIC_MCP_MIDDLEWARE_URL`
   - Value: `https://mcp-middleware.onrender.com` (from Step 2)
6. Click **Deploy**

**Option B: Render Static Site**

1. Click **New +** → **Static Site**
2. Connect repository, select `react-app`
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`
4. Add Environment Variable:
   - Key: `NEXT_PUBLIC_MCP_MIDDLEWARE_URL`
   - Value: Your middleware URL from Step 2
5. Deploy

---

## Option 2: Railway

### Deploy Weather MCP Server

```bash
cd weather
railway login
railway init
railway up
railway variables set PORT=3002
```

Note the URL from Railway dashboard.

### Deploy Middleware

```bash
cd ../mcp-middleware
railway init
railway up
railway variables set ANTHROPIC_API_KEY=your_key_here
railway variables set MCP_SERVER_URL=https://your-weather-url.railway.app/mcp
railway variables set MCP_SERVER_API_KEY=demo-api-key-123
```

### Deploy React App

```bash
cd ../react-app
railway init
railway up
railway variables set NEXT_PUBLIC_MCP_MIDDLEWARE_URL=https://your-middleware-url.railway.app
```

---

## Option 3: Fly.io

### Prerequisites
```bash
curl -L https://fly.io/install.sh | sh
fly auth signup
```

### Deploy Weather MCP Server

```bash
cd weather
fly launch --name weather-mcp --dockerfile Dockerfile.production
fly secrets set PORT=3002
fly deploy
```

### Deploy Middleware

```bash
cd ../mcp-middleware
fly launch --name mcp-middleware --dockerfile Dockerfile.production
fly secrets set ANTHROPIC_API_KEY=your_key_here
fly secrets set MCP_SERVER_URL=https://weather-mcp.fly.dev/mcp
fly secrets set MCP_SERVER_API_KEY=demo-api-key-123
fly deploy
```

### Deploy React App

```bash
cd ../react-app
fly launch --name mcp-chatbot --dockerfile Dockerfile.production
fly secrets set NEXT_PUBLIC_MCP_MIDDLEWARE_URL=https://mcp-middleware.fly.dev
fly deploy
```

---

## Option 4: Local Docker Testing

### Development Mode

```bash
# Create .env file with ANTHROPIC_API_KEY
echo "ANTHROPIC_API_KEY=your_key_here" > .env

# Start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Middleware: http://localhost:3001
# Weather MCP: http://localhost:3002
```

### Production Mode (Local Testing)

```bash
docker-compose -f docker-compose.production.yml up --build
```

---

## Environment Variables Summary

### Weather MCP Server
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3002 | Server port |
| NODE_ENV | No | production | Environment |

### Middleware
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| ANTHROPIC_API_KEY | Yes | - | Claude API key |
| MCP_SERVER_URL | Yes | http://localhost:3002/mcp | Weather MCP server URL |
| MCP_SERVER_API_KEY | Yes | demo-api-key-123 | Bearer token for weather MCP |
| PORT | No | 3001 | Server port |

### React App
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| NEXT_PUBLIC_MCP_MIDDLEWARE_URL | Yes | - | Middleware URL |

---

## Security Best Practices

### 1. Change Default API Key
Replace `demo-api-key-123` with a secure token:
```bash
# Generate a secure token
openssl rand -hex 32

# Set it on both services:
# Middleware: MCP_SERVER_API_KEY=your_secure_token
# Weather MCP: Use same token in authorization validation
```

### 2. CORS Configuration
Update middleware CORS to whitelist only your frontend domain:
```javascript
app.use(cors({
    origin: 'https://your-app.vercel.app'
}));
```

### 3. HTTPS in Production
- All production URLs should use HTTPS
- Most hosting platforms provide HTTPS by default

---

## Health Checks

### Test Each Service

```bash
# Weather MCP
curl http://localhost:3002/health

# Middleware
curl http://localhost:3001/health

# React App
curl http://localhost:3000/
```

---

## Troubleshooting

### Weather MCP Connection Failed

**Symptom**: Middleware cannot connect to Weather MCP

**Solutions**:
1. Verify `MCP_SERVER_URL` includes `/mcp` endpoint
2. Check authorization header is set correctly
3. Ensure Weather MCP service is running
4. Check logs: Weather server should show "Weather MCP Server running"

### Cold Starts (Render Free Tier)

**Symptom**: First request takes 30+ seconds

**Solutions**:
- Upgrade to paid plan ($7/month) for instant responses
- Use a ping service to keep services warm
- Accept cold start delay on free tier

### Authorization Errors

**Symptom**: 401 Unauthorized from Weather MCP

**Solutions**:
1. Verify `MCP_SERVER_API_KEY` matches on both services
2. Check Authorization header format: `Bearer <token>`
3. Review Weather MCP logs for auth errors

### CORS Errors

**Symptom**: Frontend cannot reach middleware

**Solutions**:
1. Update middleware CORS to include frontend URL
2. Ensure frontend uses correct `NEXT_PUBLIC_MCP_MIDDLEWARE_URL`
3. Verify all URLs use HTTPS in production

---

## Cost Optimization

### Free Tier Strategy
- **Frontend**: Vercel (unlimited free)
- **Middleware**: Render (750 hours = always on)
- **Weather MCP**: Render (750 hours = always on)
- **Total**: $0/month (with cold starts)

### Recommended Upgrade Path
- **Render Starter**: $7/month per service (no cold starts)
  - Weather MCP: $7/month
  - Middleware: $7/month
  - Total: $14/month
- **Frontend**: Keep on Vercel free tier

---

## Monitoring

### Render Dashboard
- View logs for each service
- Monitor CPU/memory usage
- Check response times

### Custom Monitoring
Add logging to track:
- MCP tool calls
- Response times
- Error rates
- API usage

---

## Next Steps

1. Deploy all three services
2. Test end-to-end functionality
3. Configure custom domain (optional)
4. Set up monitoring/alerts
5. Review security settings
6. Consider upgrading from free tier

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).
