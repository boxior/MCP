FROM node:20-alpine

WORKDIR /app

# Copy middleware package files
COPY mcp-middleware/package*.json ./

# Install middleware dependencies
RUN npm ci --only=production

# Copy middleware source code
COPY mcp-middleware/index.js ./

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]
