# Self-Hosted Migration Guide

This comprehensive guide covers everything you need to migrate your Surf Session Logger from Lovable Cloud to a self-hosted Docker environment.

## Table of Contents

1. [Overview](#overview)
2. [What Lovable Currently Provides](#what-lovable-currently-provides)
3. [Prerequisites](#prerequisites)
4. [Migration Steps](#migration-steps)
5. [Authentication Migration](#authentication-migration)
6. [Storage Migration](#storage-migration)
7. [Database Migration](#database-migration)
8. [Frontend Changes](#frontend-changes)
9. [Deployment](#deployment)
10. [Post-Migration Tasks](#post-migration-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This project is currently hosted on Lovable with a Supabase backend. To self-host, you'll need to replace:

| Lovable/Supabase Service | Self-Hosted Replacement |
|--------------------------|-------------------------|
| Supabase Auth | Custom JWT auth or Auth0/Clerk/etc |
| Supabase Database | PostgreSQL |
| Supabase Storage | MinIO (S3-compatible) or local filesystem |
| Supabase Edge Functions | Express.js API or similar |
| Supabase Realtime | Socket.io or PostgreSQL NOTIFY/LISTEN |
| Lovable Hosting | Docker + Nginx |

---

## What Lovable Currently Provides

### 1. **Authentication (Supabase Auth)**
- Email/password authentication
- Password reset via email
- Session management with JWT tokens
- `auth.uid()` function for RLS policies
- Automatic user creation trigger

### 2. **Database (PostgreSQL via Supabase)**
- Managed PostgreSQL database
- Row Level Security (RLS) policies
- Database functions and triggers
- Auto-generated TypeScript types

### 3. **File Storage (Supabase Storage)**
Three public buckets:
- `session-media` - Photos/videos from surf sessions
- `avatars` - User profile pictures  
- `board-photos` - Surfboard images

### 4. **Edge Functions**
- `delete-user` - Handles user account deletion

### 5. **Hosting**
- Automatic builds and deployments
- SSL certificates
- CDN for static assets

### 6. **Environment Variables**
Currently configured:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- Mapbox token (if configured)

---

## Prerequisites

Before starting the migration, ensure you have:

- [ ] Docker and Docker Compose installed
- [ ] Node.js 18+ installed locally
- [ ] PostgreSQL client (`psql`) for data export
- [ ] Access to your Supabase project dashboard
- [ ] A server or VPS for hosting (optional, can run locally)

---

## Migration Steps

### Step 1: Export Your Data

Connect to your Supabase database and export all data:

```bash
# Get your database connection string from Supabase dashboard
# Settings > Database > Connection string

# Export all tables
pg_dump "postgres://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres" \
  --data-only \
  --schema=public \
  -f data_export.sql
```

Alternatively, use the queries in `sql/08_data_export.sql`.

### Step 2: Export Storage Files

Download all files from Supabase Storage:

```bash
# Using Supabase CLI
supabase storage download session-media --project-ref cfvfoyrlaqyvxyitqkew
supabase storage download avatars --project-ref cfvfoyrlaqyvxyitqkew
supabase storage download board-photos --project-ref cfvfoyrlaqyvxyitqkew
```

Or manually download from the Supabase dashboard.

### Step 3: Set Up Docker Environment

```bash
# Navigate to migration scripts
cd migration/scripts

# Copy environment template
cp .env.example .env

# Edit .env with your secure passwords
nano .env

# Start the database first
docker-compose up -d db

# Wait for database to be ready
docker-compose logs -f db

# Run schema migrations
docker-compose exec db psql -U surflog -d surflog -f /docker-entrypoint-initdb.d/sql/01_enums.sql
docker-compose exec db psql -U surflog -d surflog -f /docker-entrypoint-initdb.d/sql/02_tables.sql
docker-compose exec db psql -U surflog -d surflog -f /docker-entrypoint-initdb.d/sql/03_functions.sql
docker-compose exec db psql -U surflog -d surflog -f /docker-entrypoint-initdb.d/sql/04_triggers.sql
```

### Step 4: Import Your Data

```bash
# Import the exported data
docker-compose exec -T db psql -U surflog -d surflog < data_export.sql
```

### Step 5: Set Up Storage (MinIO)

```bash
# Start MinIO
docker-compose up -d minio

# Access MinIO console at http://localhost:9001
# Create buckets: session-media, avatars, board-photos

# Upload your exported files to the appropriate buckets
```

---

## Authentication Migration

The biggest change is replacing Supabase Auth. You have several options:

### Option A: Build Custom JWT Auth (Recommended for learning)

Create a simple Express.js API:

```javascript
// api/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from './db.js';

export async function signUp(email, password, displayName) {
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await pool.query(
    `INSERT INTO users (email, password_hash) 
     VALUES ($1, $2) RETURNING id`,
    [email, hashedPassword]
  );
  
  // Create profile
  await pool.query(
    `INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)`,
    [result.rows[0].id, displayName]
  );
  
  return generateToken(result.rows[0].id);
}

export async function signIn(email, password) {
  const result = await pool.query(
    'SELECT id, password_hash FROM users WHERE email = $1',
    [email]
  );
  
  if (!result.rows[0]) throw new Error('User not found');
  
  const valid = await bcrypt.compare(password, result.rows[0].password_hash);
  if (!valid) throw new Error('Invalid password');
  
  return generateToken(result.rows[0].id);
}

function generateToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}
```

### Option B: Use Auth0 or Clerk (Easier)

These services provide drop-in authentication:

```javascript
// Using Auth0
import { Auth0Provider } from '@auth0/auth0-react';

<Auth0Provider
  domain="your-domain.auth0.com"
  clientId="your-client-id"
  redirectUri={window.location.origin}
>
  <App />
</Auth0Provider>
```

### Updating AuthContext

Replace `src/contexts/AuthContext.tsx`:

```typescript
// For custom JWT auth
import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken(token).then(setUser).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email, password) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      return { error: new Error('Invalid credentials') };
    }
    
    const { token, user } = await response.json();
    localStorage.setItem('auth_token', token);
    setUser(user);
    return { error: null };
  };

  // ... rest of implementation
};
```

---

## Storage Migration

Replace Supabase Storage with MinIO or direct file uploads:

### MinIO Client Setup

```typescript
// src/lib/storage.ts
import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: import.meta.env.VITE_MINIO_ENDPOINT || 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: import.meta.env.VITE_MINIO_ACCESS_KEY,
  secretKey: import.meta.env.VITE_MINIO_SECRET_KEY,
});

export async function uploadFile(bucket: string, file: File, path: string) {
  const buffer = await file.arrayBuffer();
  await minioClient.putObject(bucket, path, Buffer.from(buffer), file.size, {
    'Content-Type': file.type,
  });
  
  return `${import.meta.env.VITE_STORAGE_URL}/${bucket}/${path}`;
}

export function getPublicUrl(bucket: string, path: string) {
  return `${import.meta.env.VITE_STORAGE_URL}/${bucket}/${path}`;
}
```

### Update Upload Components

Find all places using Supabase storage and replace:

```typescript
// Before (Supabase)
const { data, error } = await supabase.storage
  .from('session-media')
  .upload(path, file);

// After (MinIO via API)
const formData = new FormData();
formData.append('file', file);
formData.append('bucket', 'session-media');
formData.append('path', path);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Database Migration

### Replacing RLS with API-Level Authorization

Since RLS uses `auth.uid()` which is Supabase-specific, you'll need to handle authorization in your API:

```javascript
// api/middleware/auth.js
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// api/routes/sessions.js
router.get('/sessions', requireAuth, async (req, res) => {
  const sessions = await pool.query(
    'SELECT * FROM sessions WHERE user_id = $1 OR is_public = true',
    [req.userId]
  );
  res.json(sessions.rows);
});

router.post('/sessions', requireAuth, async (req, res) => {
  const session = await pool.query(
    `INSERT INTO sessions (user_id, location, ...) VALUES ($1, $2, ...) RETURNING *`,
    [req.userId, req.body.location, ...]
  );
  res.json(session.rows[0]);
});
```

### Creating a Users Table

You'll need to create a users table (Supabase has this in the auth schema):

```sql
-- Add to 02_tables.sql
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email_confirmed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update profiles to reference users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
```

---

## Frontend Changes

### Update Supabase Client Usage

Find all imports of `@/integrations/supabase/client` and replace with API calls:

```typescript
// Before
import { supabase } from '@/integrations/supabase/client';
const { data } = await supabase.from('sessions').select('*');

// After
import { api } from '@/lib/api';
const data = await api.get('/sessions');
```

### Create API Client

```typescript
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  private getToken() {
    return localStorage.getItem('auth_token');
  }

  private async request(method: string, path: string, body?: any) {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.getToken() && { Authorization: `Bearer ${this.getToken()}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body: any) { return this.request('POST', path, body); }
  put(path: string, body: any) { return this.request('PUT', path, body); }
  delete(path: string) { return this.request('DELETE', path); }
}

export const api = new ApiClient();
```

### Files to Update

These files need Supabase references replaced:

1. `src/contexts/AuthContext.tsx` - Authentication
2. `src/pages/Auth.tsx` - Login/signup forms
3. `src/pages/LogSession.tsx` - Creating sessions
4. `src/pages/Sessions.tsx` - Fetching sessions
5. `src/pages/Profile.tsx` - User profile
6. `src/pages/Settings.tsx` - Password changes
7. `src/pages/Quiver.tsx` - Surfboard management
8. `src/pages/Feed.tsx` - Social feed
9. `src/pages/Admin.tsx` - Admin panel
10. All components that fetch data

---

## Deployment

### Option 1: Single Server (Simple)

```bash
# On your server
git clone your-repo
cd your-repo/migration/scripts

# Configure environment
cp .env.example .env
nano .env  # Set secure passwords

# Build and start
docker-compose up -d

# Set up SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Cloud Providers

**DigitalOcean/Linode/Vultr:**
- Create a $10-20/month VPS
- Install Docker
- Follow single server instructions

**AWS/GCP/Azure:**
- Use managed PostgreSQL (RDS, Cloud SQL, etc.)
- Use S3 for storage instead of MinIO
- Deploy frontend to CloudFront/Cloud CDN
- Run API on ECS/Cloud Run/App Service

---

## Post-Migration Tasks

### 1. Make First Admin

```sql
-- Connect to your database
psql -U surflog -d surflog

-- Find your user ID
SELECT id, email FROM users;

-- Make admin (replace with your user_id)
INSERT INTO user_roles (user_id, role) 
VALUES ('your-user-id-here', 'admin');
```

### 2. Set Up Email (for password reset)

You'll need an email service like:
- SendGrid
- Mailgun  
- AWS SES
- SMTP server

```javascript
// api/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordReset(email, resetToken) {
  await transporter.sendMail({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: 'Reset Your Password',
    html: `<a href="https://yourdomain.com/reset-password?token=${resetToken}">Reset Password</a>`,
  });
}
```

### 3. Set Up Backups

```bash
# Add to crontab
0 2 * * * docker-compose exec -T db pg_dump -U surflog surflog > /backups/surflog_$(date +\%Y\%m\%d).sql
```

### 4. Set Up Monitoring

Consider using:
- Uptime monitoring (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Log aggregation (Loki, CloudWatch)

---

## Troubleshooting

### Common Issues

**Database connection refused:**
```bash
# Check if database is running
docker-compose ps
docker-compose logs db
```

**Storage uploads failing:**
```bash
# Check MinIO is running
docker-compose logs minio
# Verify bucket exists and permissions are correct
```

**Auth not working:**
- Verify JWT_SECRET matches between API and token generation
- Check token expiration
- Ensure CORS is configured correctly

**Missing data after migration:**
- Verify all foreign keys are satisfied
- Check for UUID format differences
- Review import logs for errors

---

## Need Help?

If you encounter issues:

1. Check Docker logs: `docker-compose logs -f [service]`
2. Connect to database: `docker-compose exec db psql -U surflog`
3. Test API endpoints with curl/Postman
4. Review browser network tab for errors

---

## Cost Comparison

| Service | Lovable Cloud | Self-Hosted (VPS) |
|---------|---------------|-------------------|
| Hosting | Included | $5-20/month |
| Database | Included | Included in VPS |
| Storage | Included | Included in VPS |
| Domain | Optional | $10-15/year |
| SSL | Included | Free (Let's Encrypt) |
| **Total** | Lovable subscription | ~$5-25/month |

---

## Files in This Migration Package

```
migration/
├── MIGRATION_GUIDE.md          # This document
├── sql/
│   ├── 01_enums.sql           # Database enums
│   ├── 02_tables.sql          # Table definitions
│   ├── 03_functions.sql       # Database functions
│   ├── 04_triggers.sql        # Triggers
│   ├── 05_rls_policies.sql    # RLS policies (reference)
│   ├── 06_storage.sql         # Storage setup (Supabase)
│   ├── 07_make_admin.sql      # Admin creation script
│   └── 08_data_export.sql     # Data export queries
└── scripts/
    ├── docker-compose.yml     # Docker setup
    ├── Dockerfile.frontend    # Frontend container
    ├── Dockerfile.api         # API container template
    ├── nginx.conf             # Nginx configuration
    ├── .env.example           # Environment template
    └── init-db.sh             # Database init script
```

Good luck with your migration! 🏄‍♂️
