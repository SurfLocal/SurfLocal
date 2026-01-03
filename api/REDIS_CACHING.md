# Redis Caching Implementation Guide

**Status:** Not yet implemented  
**Priority:** Medium (Performance optimization)  
**Estimated Time:** 2-3 hours

---

## Overview

Redis caching will significantly improve API performance by reducing database queries for frequently accessed data.

## Why Redis?

- **Speed** - In-memory data store (sub-millisecond latency)
- **Scalability** - Handles high concurrent requests
- **Session Storage** - Better than in-memory for multi-server deployments
- **Rate Limiting** - Built-in support for rate limiting
- **Pub/Sub** - Real-time features (future use)

## Use Cases for Salt

1. **Session Storage** - Store JWT sessions
2. **User Profiles** - Cache frequently accessed profiles
3. **Public Feed** - Cache public sessions list
4. **Spot Data** - Cache surf spot information
5. **Rate Limiting** - Track API request counts
6. **Leaderboards** - Cache user statistics

## Installation

### Option 1: Docker (Recommended for Development)

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine
```

### Option 2: Kubernetes (Production)

```yaml
# helm/redis/values.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  ports:
  - port: 6379
  selector:
    app: redis
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

### Option 3: Managed Service (Production)

- **AWS ElastiCache**
- **Google Cloud Memorystore**
- **Azure Cache for Redis**
- **Redis Cloud**

## API Integration

### Install Dependencies

```bash
cd api
npm install redis
npm install --save-dev @types/redis
```

### Create Redis Client

**File:** `api/src/config/redis.ts`

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis connected'));

export const connectRedis = async () => {
  await redisClient.connect();
};

export const cache = {
  async get(key: string) {
    return await redisClient.get(key);
  },

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await redisClient.setEx(key, ttl, value);
    } else {
      await redisClient.set(key, value);
    }
  },

  async del(key: string) {
    await redisClient.del(key);
  },

  async exists(key: string) {
    return await redisClient.exists(key);
  },

  async incr(key: string) {
    return await redisClient.incr(key);
  },

  async expire(key: string, seconds: number) {
    await redisClient.expire(key, seconds);
  },
};

export default redisClient;
```

### Update Server Startup

```typescript
// api/src/index.ts
import { connectRedis } from './config/redis';

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection established');

    await connectRedis();
    console.log('Redis connected');

    await ensureBucketsExist();
    console.log('MinIO buckets verified');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};
```

## Caching Strategies

### 1. Cache-Aside Pattern (Lazy Loading)

```typescript
// api/src/routes/profiles.ts
import { cache } from '../config/redis';

router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `profile:${userId}`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Cache miss - fetch from database
  const result = await query(
    `SELECT p.*, ... FROM profiles p WHERE p.user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Profile not found');
  }

  const profile = result.rows[0];

  // Store in cache (TTL: 5 minutes)
  await cache.set(cacheKey, JSON.stringify(profile), 300);

  res.json(profile);
}));
```

### 2. Write-Through Pattern

```typescript
router.put('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Update database
  const result = await query(
    `UPDATE profiles SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );

  const profile = result.rows[0];

  // Update cache immediately
  const cacheKey = `profile:${profile.user_id}`;
  await cache.set(cacheKey, JSON.stringify(profile), 300);

  res.json(profile);
}));
```

### 3. Cache Invalidation

```typescript
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Get user_id before deleting
  const session = await query('SELECT user_id FROM sessions WHERE id = $1', [id]);
  const userId = session.rows[0].user_id;

  // Delete from database
  await query('DELETE FROM sessions WHERE id = $1', [id]);

  // Invalidate related caches
  await cache.del(`session:${id}`);
  await cache.del(`sessions:user:${userId}`);
  await cache.del('sessions:public'); // Public feed cache

  res.json({ message: 'Session deleted successfully' });
}));
```

## Caching Examples

### Public Feed Cache

```typescript
router.get('/public', asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const cacheKey = `sessions:public:${limit}:${offset}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const result = await query(/* ... */);

  // Cache for 2 minutes
  await cache.set(cacheKey, JSON.stringify(result.rows), 120);

  res.json(result.rows);
}));
```

### User Session Cache

```typescript
router.get('/user/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `sessions:user:${userId}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const result = await query(/* ... */);

  // Cache for 5 minutes
  await cache.set(cacheKey, JSON.stringify(result.rows), 300);

  res.json(result.rows);
}));
```

### Spot Data Cache

```typescript
router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = 'spots:all';

  const cached = await cache.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const result = await query('SELECT * FROM spots ORDER BY name');

  // Cache for 1 hour (spots don't change often)
  await cache.set(cacheKey, JSON.stringify(result.rows), 3600);

  res.json(result.rows);
}));
```

## Rate Limiting with Redis

```typescript
// api/src/middleware/rateLimiter.ts
import { cache } from '../config/redis';
import { ApiError } from './errorHandler';

export const rateLimiter = (maxRequests: number, windowSeconds: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;
    const key = `rate:${ip}`;

    const current = await cache.incr(key);

    if (current === 1) {
      await cache.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      throw new ApiError(429, 'Too many requests');
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

    next();
  };
};

// Usage
app.use('/api/auth', rateLimiter(5, 60)); // 5 requests per minute for auth
app.use('/api/', rateLimiter(100, 60)); // 100 requests per minute for general API
```

## Session Storage with Redis

```typescript
// Store JWT sessions in Redis for revocation capability
export const storeSession = async (userId: string, token: string) => {
  const key = `session:${userId}:${token}`;
  await cache.set(key, 'active', 604800); // 7 days
};

export const revokeSession = async (userId: string, token: string) => {
  const key = `session:${userId}:${token}`;
  await cache.del(key);
};

export const isSessionValid = async (userId: string, token: string) => {
  const key = `session:${userId}:${token}`;
  return await cache.exists(key);
};
```

## Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_TTL_DEFAULT=300
```

## Cache Keys Convention

Use a consistent naming pattern:

```
{resource}:{identifier}:{optional_params}

Examples:
- profile:user123
- session:abc-def-123
- sessions:user:user123
- sessions:public:50:0
- spot:location:california
- rate:192.168.1.1
```

## Monitoring

```typescript
// Health check endpoint
app.get('/health/redis', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', redis: 'disconnected' });
  }
});
```

## Performance Gains

Expected improvements with Redis caching:

- **Profile lookups**: 200ms → 5ms (40x faster)
- **Public feed**: 150ms → 3ms (50x faster)
- **Spot data**: 100ms → 2ms (50x faster)
- **Reduced database load**: 60-80% fewer queries

## Best Practices

1. **Set TTL** - Always set expiration times
2. **Invalidate on writes** - Clear cache when data changes
3. **Cache small objects** - Don't cache large datasets
4. **Monitor hit rate** - Track cache effectiveness
5. **Handle failures gracefully** - Fall back to database if Redis is down

## Implementation Timeline

1. **Hour 1** - Set up Redis, create client configuration
2. **Hour 2** - Implement caching for profiles and sessions
3. **Hour 3** - Add rate limiting and monitoring

## Next Steps

1. Deploy Redis to Kubernetes cluster
2. Implement caching layer by layer
3. Monitor cache hit rates
4. Tune TTL values based on usage patterns
5. Consider Redis Cluster for high availability
