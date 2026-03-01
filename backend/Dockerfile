# ECHO Engine: Production Sandbox
# Powered by Playwright & Node.js

FROM mcr.microsoft.com/playwright:v1.45.0-noble

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose the Tool Gateway port
EXPOSE 3001

# Run the engine
CMD ["npm", "start"]
