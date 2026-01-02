# MinIO / S3 Storage Migration Guide

This document provides comprehensive guidance for migrating from Supabase Storage to a self-hosted MinIO (S3-compatible) storage solution running in Kubernetes.

## Table of Contents

1. [Overview](#overview)
2. [Current Storage Architecture](#current-storage-architecture)
3. [MinIO Setup in Kubernetes](#minio-setup-in-kubernetes)
4. [Bucket Configuration](#bucket-configuration)
5. [Storage Path Conventions](#storage-path-conventions)
6. [Code Migration](#code-migration)
7. [Data Migration](#data-migration)
8. [URL Format Changes](#url-format-changes)
9. [Security Considerations](#security-considerations)

---

## Overview

The application currently uses 3 Supabase Storage buckets for media files:

| Bucket | Purpose | Access | Typical Size |
|--------|---------|--------|--------------|
| `session-media` | Photos/videos from surf sessions | Public | Largest - contains all session uploads |
| `avatars` | User profile pictures | Public | Small - one per user |
| `board-photos` | Surfboard images for quiver | Public | Medium - multiple per user |

---

## Current Storage Architecture

### Supabase Storage URLs

Current URL format:
```
https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/{bucket}/{path}
```

Examples:
```
https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/avatars/a81d15b3-4862-4ee6-a521-b2fbedb30df4/profile.jpg
https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/session-media/a81d15b3-4862-4ee6-a521-b2fbedb30df4/session-abc123/photo1.jpg
https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/board-photos/a81d15b3-4862-4ee6-a521-b2fbedb30df4/board-xyz789.jpg
```

### Path Structure

```
avatars/
└── {user_id}/
    └── profile.{ext}

session-media/
└── {user_id}/
    └── {session_id}/
        ├── photo1.jpg
        ├── photo2.jpg
        └── video1.mp4

board-photos/
└── {user_id}/
    └── {board_id}.{ext}
```

---

## MinIO Setup in Kubernetes

### Helm Chart Installation

```bash
# Add MinIO Helm repo
helm repo add minio https://charts.min.io/
helm repo update

# Create namespace
kubectl create namespace minio

# Install MinIO
helm install minio minio/minio \
  --namespace minio \
  --set mode=standalone \
  --set replicas=1 \
  --set persistence.size=100Gi \
  --set resources.requests.memory=512Mi \
  --set rootUser=minio-admin \
  --set rootPassword=<your-secure-password> \
  --set consoleService.type=ClusterIP \
  --set service.type=ClusterIP
```

### Kubernetes Manifests (Alternative)

```yaml
# minio-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: storage
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args:
        - server
        - /data
        - --console-address
        - ":9001"
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef:
              name: minio-credentials
              key: root-user
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: minio-credentials
              key: root-password
        ports:
        - containerPort: 9000
          name: api
        - containerPort: 9001
          name: console
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: minio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: storage
spec:
  selector:
    app: minio
  ports:
  - name: api
    port: 9000
    targetPort: 9000
  - name: console
    port: 9001
    targetPort: 9001
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
  namespace: storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard  # Adjust based on your cluster
---
apiVersion: v1
kind: Secret
metadata:
  name: minio-credentials
  namespace: storage
type: Opaque
stringData:
  root-user: minio-admin
  root-password: <your-secure-password>
```

### Ingress Configuration

```yaml
# minio-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio
  namespace: storage
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - storage.yourdomain.com
    - console.storage.yourdomain.com
    secretName: minio-tls
  rules:
  - host: storage.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: minio
            port:
              number: 9000
  - host: console.storage.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: minio
            port:
              number: 9001
```

---

## Bucket Configuration

### Create Buckets via MinIO Client

```bash
# Install mc (MinIO Client)
brew install minio/stable/mc  # macOS
# or
wget https://dl.min.io/client/mc/release/linux-amd64/mc  # Linux

# Configure alias
mc alias set surflog https://storage.yourdomain.com minio-admin <password>

# Create buckets
mc mb surflog/session-media
mc mb surflog/avatars
mc mb surflog/board-photos

# Set public access policy
mc anonymous set download surflog/session-media
mc anonymous set download surflog/avatars
mc anonymous set download surflog/board-photos
```

### Bucket Policies

```json
// session-media-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::session-media/*"]
    }
  ]
}
```

Apply policy:
```bash
mc anonymous set-json session-media-policy.json surflog/session-media
```

---

## Storage Path Conventions

### Recommended Structure

```
surflog-storage/
├── avatars/
│   └── {user_id}/
│       └── avatar.{ext}           # Single avatar per user
│
├── session-media/
│   └── {user_id}/
│       └── sessions/
│           └── {session_id}/
│               ├── {uuid}.jpg     # Session photos
│               └── {uuid}.mp4     # Session videos
│
└── board-photos/
    └── {user_id}/
        └── boards/
            └── {board_id}.{ext}   # Board photos
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Avatar | `{user_id}/avatar.{ext}` | `a81d15b3.../avatar.jpg` |
| Session Photo | `{user_id}/sessions/{session_id}/{uuid}.{ext}` | `a81d15b3.../sessions/xyz123/abc456.jpg` |
| Session Video | `{user_id}/sessions/{session_id}/{uuid}.{ext}` | `a81d15b3.../sessions/xyz123/def789.mp4` |
| Board Photo | `{user_id}/boards/{board_id}.{ext}` | `a81d15b3.../boards/board123.jpg` |

---

## Code Migration

### Storage Utility Class

Create a new storage utility to replace Supabase storage calls:

```typescript
// src/lib/storage.ts
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'https://storage.yourdomain.com';
const API_URL = import.meta.env.VITE_API_URL || 'https://api.yourdomain.com';

interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

class StorageClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Upload a file to storage
   */
  async upload(
    bucket: 'avatars' | 'session-media' | 'board-photos',
    path: string,
    file: File
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', path);

    const response = await fetch(`${API_URL}/storage/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      return { url: '', path: '', error };
    }

    const data = await response.json();
    return {
      url: this.getPublicUrl(bucket, path),
      path: data.path,
    };
  }

  /**
   * Delete a file from storage
   */
  async delete(bucket: string, path: string): Promise<{ error?: string }> {
    const response = await fetch(`${API_URL}/storage/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
      },
      body: JSON.stringify({ bucket, path }),
    });

    if (!response.ok) {
      return { error: await response.text() };
    }

    return {};
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    return `${STORAGE_URL}/${bucket}/${path}`;
  }

  /**
   * Generate upload path for avatar
   */
  getAvatarPath(userId: string, filename: string): string {
    const ext = filename.split('.').pop();
    return `${userId}/avatar.${ext}`;
  }

  /**
   * Generate upload path for session media
   */
  getSessionMediaPath(userId: string, sessionId: string, filename: string): string {
    const uuid = crypto.randomUUID();
    const ext = filename.split('.').pop();
    return `${userId}/sessions/${sessionId}/${uuid}.${ext}`;
  }

  /**
   * Generate upload path for board photo
   */
  getBoardPhotoPath(userId: string, boardId: string, filename: string): string {
    const ext = filename.split('.').pop();
    return `${userId}/boards/${boardId}.${ext}`;
  }
}

export const storage = new StorageClient();
```

### Backend Upload Handler (Express.js)

```typescript
// api/routes/storage.ts
import express from 'express';
import multer from 'multer';
import { Client } from 'minio';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio.storage.svc.cluster.local',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

const ALLOWED_BUCKETS = ['avatars', 'session-media', 'board-photos'];

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { bucket, path } = req.body;
    const file = req.file;
    const userId = req.userId;

    if (!file || !bucket || !path) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }

    // Ensure path starts with user's ID for security
    if (!path.startsWith(userId)) {
      return res.status(403).json({ error: 'Unauthorized path' });
    }

    await minioClient.putObject(
      bucket,
      path,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype }
    );

    res.json({ path, bucket });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.delete('/delete', requireAuth, async (req, res) => {
  try {
    const { bucket, path } = req.body;
    const userId = req.userId;

    if (!bucket || !path) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure user can only delete their own files
    if (!path.startsWith(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await minioClient.removeObject(bucket, path);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
```

### Code Replacement Examples

**Before (Supabase):**
```typescript
// Upload avatar
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/profile.jpg`, file);

const url = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/profile.jpg`).data.publicUrl;
```

**After (MinIO):**
```typescript
// Upload avatar
import { storage } from '@/lib/storage';

const path = storage.getAvatarPath(userId, file.name);
const { url, error } = await storage.upload('avatars', path, file);
```

---

## Data Migration

### Export from Supabase Storage

```bash
#!/bin/bash
# export-storage.sh

PROJECT_REF="cfvfoyrlaqyvxyitqkew"
BUCKETS=("avatars" "session-media" "board-photos")

for bucket in "${BUCKETS[@]}"; do
  echo "Downloading $bucket..."
  mkdir -p ./export/$bucket
  
  # Using Supabase CLI
  supabase storage download $bucket --project-ref $PROJECT_REF --output ./export/$bucket
done

echo "Export complete!"
```

### Import to MinIO

```bash
#!/bin/bash
# import-to-minio.sh

MC_ALIAS="surflog"
BUCKETS=("avatars" "session-media" "board-photos")

for bucket in "${BUCKETS[@]}"; do
  echo "Uploading $bucket to MinIO..."
  mc cp --recursive ./export/$bucket/ $MC_ALIAS/$bucket/
done

echo "Import complete!"
```

### URL Migration Script

After migrating files, update database URLs:

```sql
-- Update avatar URLs in profiles
UPDATE profiles
SET avatar_url = REPLACE(
  avatar_url,
  'https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/avatars/',
  'https://storage.yourdomain.com/avatars/'
)
WHERE avatar_url LIKE '%supabase.co%';

-- Update session media URLs
UPDATE session_media
SET url = REPLACE(
  url,
  'https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/session-media/',
  'https://storage.yourdomain.com/session-media/'
)
WHERE url LIKE '%supabase.co%';

-- Update board photo URLs
UPDATE boards
SET photo_url = REPLACE(
  photo_url,
  'https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/board-photos/',
  'https://storage.yourdomain.com/board-photos/'
)
WHERE photo_url LIKE '%supabase.co%';
```

---

## URL Format Changes

### Old vs New URL Structure

| Type | Supabase URL | MinIO URL |
|------|--------------|-----------|
| Avatar | `https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/avatars/{path}` | `https://storage.yourdomain.com/avatars/{path}` |
| Session Media | `https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/session-media/{path}` | `https://storage.yourdomain.com/session-media/{path}` |
| Board Photos | `https://cfvfoyrlaqyvxyitqkew.supabase.co/storage/v1/object/public/board-photos/{path}` | `https://storage.yourdomain.com/board-photos/{path}` |

### Environment Variables

```env
# .env
VITE_STORAGE_URL=https://storage.yourdomain.com
MINIO_ENDPOINT=minio.storage.svc.cluster.local
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

---

## Security Considerations

### Access Control

1. **Bucket-level policies**: Set read-only public access for displaying images
2. **Path-based authorization**: Ensure users can only upload to their own directories
3. **File type validation**: Validate MIME types on the server
4. **Size limits**: Enforce maximum file sizes

### TLS/SSL

Always use HTTPS in production:

```yaml
# In your ingress or service configuration
spec:
  tls:
  - hosts:
    - storage.yourdomain.com
    secretName: minio-tls-cert
```

### Backup Strategy

```bash
# Cronjob for daily backups
0 2 * * * mc mirror surflog/ /backups/minio/$(date +\%Y\%m\%d)/
```

---

## Files That Need Updates

These files contain Supabase storage references:

1. `src/pages/Profile.tsx` - Avatar upload
2. `src/pages/LogSession.tsx` - Session media upload
3. `src/pages/Quiver.tsx` - Board photo upload
4. `src/components/SessionCard.tsx` - Media display
5. `src/components/UserMediaGallery.tsx` - Gallery display
6. `src/pages/Settings.tsx` - Avatar update

Search pattern to find all storage usages:
```bash
grep -r "supabase.storage" src/
grep -r "from('avatars')" src/
grep -r "from('session-media')" src/
grep -r "from('board-photos')" src/
```

---

## Checklist

- [ ] Deploy MinIO to Kubernetes
- [ ] Create buckets with proper policies
- [ ] Set up Ingress with TLS
- [ ] Export data from Supabase Storage
- [ ] Import data to MinIO
- [ ] Update database URLs
- [ ] Create storage utility class
- [ ] Update all frontend code
- [ ] Create backend upload handler
- [ ] Test uploads and downloads
- [ ] Set up backups
- [ ] Monitor storage usage
