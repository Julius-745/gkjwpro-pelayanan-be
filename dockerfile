FROM oven/bun:1-alpine

WORKDIR /app

# Install node, npm, Python, and build tools
USER root
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++

# ✅ Set python path in shell environment for node-gyp
ENV PYTHON=/usr/bin/python3
ENV HUSKY=0

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN bun run build

# Create data directory for SQLite
RUN mkdir -p /app/data && chmod 755 /app/data

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bunuser -u 1001 && \
    chown -R bunuser:nodejs /app/data

USER bunuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
