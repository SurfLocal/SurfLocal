# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY api/package*.json ./

# Install all dependencies
RUN npm ci

# Copy source files
COPY api/tsconfig.json ./
COPY api/src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Define build-time environment variables
ARG NODE_ENV=production
ARG DATABASE_HOST
ARG DATABASE_PORT
ARG DATABASE_NAME
ARG DATABASE_USER
ARG DATABASE_PASSWORD
ARG MINIO_ENDPOINT
ARG MINIO_PORT
ARG MINIO_ACCESS_KEY
ARG MINIO_SECRET_KEY
ARG JWT_SECRET
ARG JWT_EXPIRES_IN=7d

# Set runtime environment variables
ENV NODE_ENV=${NODE_ENV}
ENV DATABASE_HOST=${DATABASE_HOST}
ENV DATABASE_PORT=${DATABASE_PORT}
ENV DATABASE_NAME=${DATABASE_NAME}
ENV DATABASE_USER=${DATABASE_USER}
ENV DATABASE_PASSWORD=${DATABASE_PASSWORD}
ENV MINIO_ENDPOINT=${MINIO_ENDPOINT}
ENV MINIO_PORT=${MINIO_PORT}
ENV MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
ENV MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
ENV JWT_SECRET=${JWT_SECRET}
ENV JWT_EXPIRES_IN=${JWT_EXPIRES_IN}

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY api/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Expose the API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the application
CMD ["node", "dist/index.js"]
