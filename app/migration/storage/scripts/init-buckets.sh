#!/bin/bash
# ============================================
# MinIO Bucket Initialization Script
# Run this after MinIO is deployed
# ============================================

set -e

# Configuration - Update these values
MINIO_ENDPOINT="${MINIO_ENDPOINT:-https://storage.yourdomain.com}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minio-admin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-your-secure-password}"
MC_ALIAS="surflog"

echo "============================================"
echo "MinIO Bucket Initialization"
echo "============================================"

# Check if mc is installed
if ! command -v mc &> /dev/null; then
    echo "MinIO Client (mc) not found. Installing..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
        chmod +x /usr/local/bin/mc
    else
        echo "Please install MinIO Client manually: https://min.io/docs/minio/linux/reference/minio-mc.html"
        exit 1
    fi
fi

# Configure alias
echo "Configuring MinIO alias..."
mc alias set $MC_ALIAS $MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Create buckets
echo "Creating buckets..."
mc mb --ignore-existing $MC_ALIAS/avatars
mc mb --ignore-existing $MC_ALIAS/session-media
mc mb --ignore-existing $MC_ALIAS/board-photos

# Set public read access on all buckets
echo "Setting public access policies..."
mc anonymous set download $MC_ALIAS/avatars
mc anonymous set download $MC_ALIAS/session-media
mc anonymous set download $MC_ALIAS/board-photos

# Verify buckets
echo ""
echo "Verifying bucket configuration..."
mc ls $MC_ALIAS

echo ""
echo "============================================"
echo "Bucket initialization complete!"
echo "============================================"
echo ""
echo "Buckets created:"
echo "  - avatars (public read)"
echo "  - session-media (public read)"
echo "  - board-photos (public read)"
echo ""
echo "Access URLs:"
echo "  - $MINIO_ENDPOINT/avatars/{path}"
echo "  - $MINIO_ENDPOINT/session-media/{path}"
echo "  - $MINIO_ENDPOINT/board-photos/{path}"
