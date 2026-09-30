# Use official Node.js runtime as parent image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci --include=dev || npm install --include=dev

# Copy all application code
COPY . .

# Build Vite frontend and production server bundle
RUN npm run build

# Remove development-only files if necessary, keeping runtime dependencies
RUN npm prune --production

# Expose port (Cloud Run passes dynamic $PORT environment variable at runtime)
EXPOSE 3000

# Start production server (listens on process.env.PORT || 3000 and binds to 0.0.0.0)
CMD ["npm", "start"]
