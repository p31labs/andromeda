FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build TypeScript
RUN npm run build

# Copy source for health check and runtime
COPY --chown=node:node . .

# Create non-root user for security
USER node

# Expose webhook port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Start the bot
CMD ["node", "dist/index.js"]