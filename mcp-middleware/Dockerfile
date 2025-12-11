FROM node:20-alpine

WORKDIR /app

# Copy middleware package files
COPY mcp-middleware/package*.json ./

# Install middleware dependencies
RUN npm ci --only=production

# Copy middleware source code
COPY mcp-middleware/index.js ./

# Copy weather MCP server
WORKDIR /app/weather
COPY weather/package*.json ./
RUN npm ci --only=production

COPY weather/tsconfig.json ./
COPY weather/src ./src
RUN npm install -D typescript @types/node && \
    npx tsc && \
    chmod 755 build/index.js && \
    npm uninstall typescript @types/node

# Back to middleware directory
WORKDIR /app

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
