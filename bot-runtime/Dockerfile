# Node.js LTS lightweight container for Persistent Mineflayer Runtime
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules if needed
RUN apk add --no-cache python3 make g++ git

# Copy dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "standalone-daemon.js"]
