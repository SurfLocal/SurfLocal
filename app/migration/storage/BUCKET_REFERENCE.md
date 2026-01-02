# Surf Logger - Storage Bucket Reference

## Bucket Overview

| Bucket | Purpose | Access Level | Max File Size |
|--------|---------|--------------|---------------|
| `avatars` | User profile pictures | Public Read | 5 MB |
| `session-media` | Photos and videos from surf sessions | Public Read | 50 MB |
| `board-photos` | Surfboard images for user's quiver | Public Read | 10 MB |

---

## Bucket: `avatars`

### Purpose
Stores user profile pictures (avatars).

### Path Structure
```
avatars/
└── {user_id}/
    └── avatar.{extension}
```

### Examples
```
avatars/a81d15b3-4862-4ee6-a521-b2fbedb30df4/avatar.jpg
avatars/b92e26c4-5973-5ff7-b632-dc272g4gc525/avatar.png
```

### URL Format
```
https://storage.yourdomain.com/avatars/{user_id}/avatar.{ext}
```

### Upload Constraints
- **Max size**: 5 MB
- **Allowed types**: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Naming**: Always `avatar.{ext}` (overwrites previous)

### Database Reference
- Table: `profiles`
- Column: `avatar_url`

---

## Bucket: `session-media`

### Purpose
Stores photos and videos attached to surf sessions.

### Path Structure
```
session-media/
└── {user_id}/
    └── sessions/
        └── {session_id}/
            ├── {uuid}.jpg
            ├── {uuid}.png
            └── {uuid}.mp4
```

### Examples
```
session-media/a81d15b3-4862-4ee6-a521-b2fbedb30df4/sessions/xyz123/abc456.jpg
session-media/a81d15b3-4862-4ee6-a521-b2fbedb30df4/sessions/xyz123/def789.mp4
```

### URL Format
```
https://storage.yourdomain.com/session-media/{user_id}/sessions/{session_id}/{uuid}.{ext}
```

### Upload Constraints
- **Max size**: 50 MB (images), 100 MB (videos)
- **Allowed image types**: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- **Allowed video types**: `video/mp4`, `video/quicktime`, `video/webm`
- **Naming**: UUID-based for uniqueness

### Database Reference
- Table: `session_media`
- Columns: `url`, `media_type`, `session_id`, `user_id`

---

## Bucket: `board-photos`

### Purpose
Stores photos of surfboards in user's quiver.

### Path Structure
```
board-photos/
└── {user_id}/
    └── boards/
        └── {board_id}.{extension}
```

### Examples
```
board-photos/a81d15b3-4862-4ee6-a521-b2fbedb30df4/boards/board-xyz789.jpg
board-photos/b92e26c4-5973-5ff7-b632-dc272g4gc525/boards/board-abc123.png
```

### URL Format
```
https://storage.yourdomain.com/board-photos/{user_id}/boards/{board_id}.{ext}
```

### Upload Constraints
- **Max size**: 10 MB
- **Allowed types**: `image/jpeg`, `image/png`, `image/webp`
- **Naming**: `{board_id}.{ext}` (overwrites previous for same board)

### Database Reference
- Table: `boards`
- Column: `photo_url`

---

## Security Rules

### Upload Authorization
All uploads require a valid JWT token. The server validates:
1. User is authenticated
2. Path starts with user's own `user_id`
3. File type is in allowed list
4. File size is within limits

### Delete Authorization
Users can only delete files in their own directories:
- Path must start with `{user_id}/`
- JWT token must match the user_id in path

### Public Access
All buckets have public read access for displaying content:
```bash
mc anonymous set download surflog/avatars
mc anonymous set download surflog/session-media
mc anonymous set download surflog/board-photos
```

---

## CORS Configuration

For browser uploads, configure CORS on MinIO:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": [
        "https://yourdomain.com",
        "https://www.yourdomain.com",
        "http://localhost:5173"
      ],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

Apply with:
```bash
mc cors set cors-config.json surflog/avatars
mc cors set cors-config.json surflog/session-media
mc cors set cors-config.json surflog/board-photos
```

---

## Lifecycle Rules (Optional)

For cost optimization, consider adding lifecycle rules:

```bash
# Delete incomplete multipart uploads after 7 days
mc ilm add --expiry-days 7 --prefix "" --tags "status=incomplete" surflog/session-media
```

---

## Backup Strategy

### Daily Incremental Backup
```bash
# Mirror to backup location
mc mirror --overwrite surflog/ /backups/minio/current/

# Create dated snapshot
mc mirror surflog/ /backups/minio/snapshots/$(date +%Y%m%d)/
```

### Retention Policy
- Keep daily backups for 7 days
- Keep weekly backups for 4 weeks
- Keep monthly backups for 12 months

---

## Monitoring

### Disk Usage
```bash
mc du surflog/avatars
mc du surflog/session-media
mc du surflog/board-photos
```

### File Count
```bash
mc ls surflog/avatars --recursive | wc -l
mc ls surflog/session-media --recursive | wc -l
mc ls surflog/board-photos --recursive | wc -l
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| List bucket contents | `mc ls surflog/avatars` |
| Upload file | `mc cp file.jpg surflog/avatars/user-id/` |
| Download file | `mc cp surflog/avatars/user-id/avatar.jpg ./` |
| Delete file | `mc rm surflog/avatars/user-id/avatar.jpg` |
| Get bucket size | `mc du surflog/avatars` |
| Mirror bucket | `mc mirror surflog/avatars ./backup/` |
