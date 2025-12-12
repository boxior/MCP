FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (includes .env.local if present)
COPY . .

# Build argument for middleware URL (can be overridden during build)
ARG NEXT_PUBLIC_MCP_MIDDLEWARE_URL
ENV NEXT_PUBLIC_MCP_MIDDLEWARE_URL=${NEXT_PUBLIC_MCP_MIDDLEWARE_URL}

# Build Next.js app (will use .env.local and build args)
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=local

# Note: .env.local is already included in the build if it exists
# Runtime environment variables should be set via docker-compose or deployment platform

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
