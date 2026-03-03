# ECHO Engine: Production Docker Container
# Security-hardened containerization for Command Execution Sandbox Bypass mitigation
# Multi-stage build for minimal attack surface

# =============================================================================
# STAGE 1: Dependencies
# =============================================================================
FROM node:20-slim AS dependencies

WORKDIR /app

# Install Playwright system dependencies (required for browser automation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only (reduces attack surface)
RUN npm ci --only=production && npm cache clean --force

# =============================================================================
# STAGE 2: Production Runtime
# =============================================================================
FROM node:20-slim AS production

# Security: Create non-root user for container execution
RUN groupadd --gid 1001 echomen && \
    useradd --uid 1001 --gid echomen --shell /bin/bash --create-home echomen

WORKDIR /app

# Install Playwright runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from build stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code (only necessary files)
COPY package*.json ./
COPY index.js ./

# Create directories for logs and temp files with proper permissions
RUN mkdir -p /app/logs /app/tmp && \
    chown -R echomen:echomen /app

# Security: Switch to non-root user
USER echomen

# Set environment variables for security and Playwright
ENV NODE_ENV=production \
    PORT=3001 \
    PLAYWRIGHT_BROWSERS_PATH=/app/.browser \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 \
    CHROMIUM_FLAGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# Health check endpoint (checks if server is responding)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Expose the Tool Gateway port
EXPOSE 3001

# Run the ECHO Engine
CMD ["node", "index.js"]
