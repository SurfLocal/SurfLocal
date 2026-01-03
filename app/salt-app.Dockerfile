# Build stage - compatible with ARM64 (Raspberry Pi)
FROM node:20-alpine AS builder

# Define build-time environment variables
ARG VITE_API_URL
ARG VITE_MINIO_URL
ARG VITE_MAPBOX_TOKEN

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_MINIO_URL=${VITE_MINIO_URL}
ENV VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}

# Set the working directory inside the container
WORKDIR /app

# Copy package files
COPY app/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and configuration
COPY app/index.html ./
COPY app/tsconfig*.json ./
COPY app/vite.config.ts ./
COPY app/tailwind.config.ts ./
COPY app/postcss.config.js ./
COPY app/components.json ./
COPY app/eslint.config.js ./
COPY app/src ./src
COPY app/public ./public

# Build the application
RUN npm run build

# Nginx to serve static files
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY app/nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
