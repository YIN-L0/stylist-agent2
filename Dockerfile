# Multi-stage build for AI Fashion Stylist Agent
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm ci
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

# Copy built applications
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/data ./data

# Install only production dependencies for backend
WORKDIR /app/backend
RUN npm ci --only=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3001

# Start the backend server
WORKDIR /app/backend
CMD ["npm", "start"]
