# Deployment Guide

## Option 1: Render (Recommended for Free Tier)

### Prerequisites
- GitHub account with your MCP repository
- Render account (sign up at https://render.com)
- Anthropic API key

### Step 1: Deploy Backend (mcp-middleware)

1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `mcp-middleware`
   - **Root Directory**: `mcp-middleware`
   - **Environment**: `Docker`
   - **Plan**: `Free`
5. Add Environment Variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your API key
6. Click **Create Web Service**
7. **Note the URL** (e.g., `https://mcp-middleware.onrender.com`)

### Step 2: Deploy Frontend (react-app)

**Option A: Vercel (Best for Next.js)**

1. Go to https://vercel.com
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `react-app`
   - **Build Command**: `npm run build`
5. Add Environment Variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Your middleware URL from Step 1
6. Click **Deploy**

**Option B: Render**

1. Click **New +** → **Static Site**
2. Connect repository, select `react-app`
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`
4. Deploy

### Step 3: Update API URL in react-app

Update `/react-app/src/components/Chatbot.tsx` and `ChatbotUi.tsx`:

```typescript
// Change from:
fetch('http://localhost:3001/api/chat', ...)

// To:
fetch(process.env.NEXT_PUBLIC_API_URL || 'https://mcp-middleware.onrender.com/api/chat', ...)
```

### Step 4: Update CORS in middleware

Update `/mcp-middleware/index.js`:

```javascript
app.use((req, res, next) => {
    // Add your deployed frontend URL
    res.header('Access-Control-Allow-Origin', 'https://your-app.vercel.app');
    // ... rest of CORS config
});
```

---

## Option 2: Railway

### Steps

1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect and deploy all services
5. Add environment variables in each service settings
6. Connect services using internal URLs

---

## Option 3: Fly.io

### Prerequisites
- Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
- Sign up: `fly auth signup`

### Deploy Each Service

```bash
# Deploy middleware
cd mcp-middleware
fly launch --name mcp-middleware
fly secrets set ANTHROPIC_API_KEY=your_key_here
fly deploy

# Deploy frontend
cd ../react-app
fly launch --name mcp-chatbot
fly deploy
```

---

## Option 4: Local Docker (Testing)

```bash
# Build and run all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

---

## Important Notes

### Weather MCP Server
The weather service runs via stdio (not HTTP), so it needs to be:
1. **Bundled with middleware** (same container), OR
2. **Deployed separately** and connected via internal network

### Free Tier Limitations
- **Render**: Services sleep after 15min inactivity (~30s cold start)
- **Railway**: $5/month credit limit
- **Fly.io**: Limited to 3 VMs
- **Vercel**: Perfect for frontend, unlimited for personal use

### Production Checklist
- [ ] Set environment variables on hosting platform
- [ ] Update CORS to allow your deployed frontend URL
- [ ] Update API URLs in frontend to use deployed backend
- [ ] Add `.dockerignore` files to exclude node_modules
- [ ] Test deployments end-to-end
- [ ] Monitor free tier usage limits

---

## Troubleshooting

**Cold Starts (Render Free Tier)**
- First request after 15min takes ~30s
- Consider using a paid plan or ping service

**CORS Errors**
- Update middleware CORS to include your deployed frontend URL
- Check that URLs use HTTPS in production

**Build Failures**
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check build logs on hosting platform

---

## Cost Optimization

**Free Tier Strategy**:
- Frontend: Vercel (unlimited free)
- Backend: Render (750 hours free = always on for 1 service)
- Total Cost: $0/month

**Upgrade Path**:
- Render Starter: $7/month per service (no cold starts)
- Railway Pro: $5 credit/month → $20/month for consistent usage
- Fly.io: Pay for actual usage
