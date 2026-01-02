#!/bin/bash
# ============================================
# Storage Data Migration Script
# Exports from Supabase and imports to MinIO
# ============================================

set -e

# Configuration
SUPABASE_PROJECT_REF="cfvfoyrlaqyvxyitqkew"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-https://storage.yourdomain.com}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minio-admin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-your-secure-password}"
MC_ALIAS="surflog"
EXPORT_DIR="./storage-export"
BUCKETS=("avatars" "session-media" "board-photos")

echo "============================================"
echo "Storage Migration: Supabase → MinIO"
echo "============================================"

# Check for required tools
command -v supabase >/dev/null 2>&1 || { echo "Supabase CLI required but not installed."; exit 1; }
command -v mc >/dev/null 2>&1 || { echo "MinIO Client (mc) required but not installed."; exit 1; }

# Create export directory
mkdir -p $EXPORT_DIR

# ============================================
# Step 1: Export from Supabase
# ============================================
echo ""
echo "Step 1: Exporting from Supabase Storage..."

for bucket in "${BUCKETS[@]}"; do
    echo "  Downloading $bucket..."
    mkdir -p "$EXPORT_DIR/$bucket"
    
    # Download all files from bucket
    # Note: This uses the Supabase API directly
    # You may need to authenticate first: supabase login
    
    supabase storage download "$bucket" \
        --project-ref "$SUPABASE_PROJECT_REF" \
        --output "$EXPORT_DIR/$bucket" \
        2>/dev/null || echo "    Warning: Could not download $bucket (may be empty or require auth)"
done

echo "  Export complete!"

# ============================================
# Step 2: Configure MinIO
# ============================================
echo ""
echo "Step 2: Configuring MinIO connection..."

mc alias set $MC_ALIAS $MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# ============================================
# Step 3: Upload to MinIO
# ============================================
echo ""
echo "Step 3: Uploading to MinIO..."

for bucket in "${BUCKETS[@]}"; do
    if [ -d "$EXPORT_DIR/$bucket" ] && [ "$(ls -A $EXPORT_DIR/$bucket 2>/dev/null)" ]; then
        echo "  Uploading $bucket..."
        mc cp --recursive "$EXPORT_DIR/$bucket/" "$MC_ALIAS/$bucket/"
    else
        echo "  Skipping $bucket (empty or not found)"
    fi
done

echo "  Upload complete!"

# ============================================
# Step 4: Verify
# ============================================
echo ""
echo "Step 4: Verifying migration..."

for bucket in "${BUCKETS[@]}"; do
    count=$(mc ls $MC_ALIAS/$bucket --recursive 2>/dev/null | wc -l || echo "0")
    echo "  $bucket: $count files"
done

# ============================================
# Step 5: Generate URL update SQL
# ============================================
echo ""
echo "Step 5: Generating database URL update script..."

cat > "$EXPORT_DIR/update-urls.sql" << 'EOSQL'
-- ============================================
-- Database URL Migration Script
-- Updates storage URLs from Supabase to MinIO
-- ============================================

-- IMPORTANT: Update MINIO_BASE_URL before running!
-- Replace 'https://storage.yourdomain.com' with your actual MinIO URL

-- Update avatar URLs in profiles
UPDATE profiles
SET avatar_url = REPLACE(
    avatar_url,
    'https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/avatars/',
    'https://storage.yourdomain.com/avatars/'
)
WHERE avatar_url LIKE '%cfvfoyrlaqyvxyitqkew.supabase.co%';

-- Update session media URLs
UPDATE session_media
SET url = REPLACE(
    url,
    'https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/session-media/',
    'https://storage.yourdomain.com/session-media/'
)
WHERE url LIKE '%cfvfoyrlaqyvxyitqkew.supabase.co%';

-- Update board photo URLs
UPDATE boards
SET photo_url = REPLACE(
    photo_url,
    'https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/board-photos/',
    'https://storage.yourdomain.com/board-photos/'
)
WHERE photo_url LIKE '%cfvfoyrlaqyvxyitqkew.supabase.co%';

-- Verify the updates
SELECT 'profiles' as table_name, COUNT(*) as remaining_old_urls 
FROM profiles WHERE avatar_url LIKE '%supabase.co%'
UNION ALL
SELECT 'session_media', COUNT(*) 
FROM session_media WHERE url LIKE '%supabase.co%'
UNION ALL
SELECT 'boards', COUNT(*) 
FROM boards WHERE photo_url LIKE '%supabase.co%';
EOSQL

echo "  SQL script saved to: $EXPORT_DIR/update-urls.sql"

echo ""
echo "============================================"
echo "Migration Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Review exported files in: $EXPORT_DIR"
echo "2. Update MINIO_BASE_URL in: $EXPORT_DIR/update-urls.sql"
echo "3. Run the SQL script against your database"
echo "4. Test file access from the new URLs"
echo "5. Update frontend code to use new storage utility"
echo ""
