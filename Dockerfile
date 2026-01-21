# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Install dependencies for building native modules (if needed)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy ALL package files (needed for npm workspaces)
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install only production dependencies (--omit=dev replaces deprecated --only=production)
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=base /app/client/dist ./client/dist
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/public ./public

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8080

# Start the application using the workspace script
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
