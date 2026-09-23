# Stage 1: Build the React/Vite Frontend
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source code and configuration
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

# Build production bundle to /app/dist
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/app/data

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend application, utility modules, seed CSV, and compiled frontend
COPY server ./server
COPY src/utils ./src/utils
COPY --from=builder /app/dist ./dist

# Create directory for persistent JSON database
RUN mkdir -p /app/data

# Declare volume for persistent data storage
VOLUME ["/app/data"]

# Expose unified web & websocket port
EXPOSE 3001

# Container healthcheck using Node 22 built-in fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Run the Baby Tracker server
CMD ["node", "server/index.js"]
