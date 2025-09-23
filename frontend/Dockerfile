# Frontend-only Dockerfile for Vercel
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3000

# Start the frontend server
CMD ["npm", "run", "preview"]
