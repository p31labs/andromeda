# P31 Discord Bot Dockerfile
# Build: docker build -t p31-discord-bot .
# Run:   docker run -d --env-file .env p31-discord-bot

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist ./dist
COPY .env.example ./

# Expose webhook port
EXPOSE 3000

# Start the bot
CMD ["node", "dist/index.js"]
