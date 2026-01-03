# Salt Deployment Overview

High-level overview of the Salt surf tracking application infrastructure and how components interact.

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                         │
│                                                                   │
│  ┌─────────────┐                                                  │
│  │   Nginx     │  ← Ingress Controller                            │
│  │  Port: 80   │                                                  │
│  └──────┬──────┘                                                  │
│         │                                                         │
│         ├──────────────┬──────────────┬──────────────┐            │
│         │              │              │              │            │
│  ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐ ┌────▼─────┐        │
│  │  Frontend   │ │ Backend  │ │  PostgreSQL │ │  MinIO   │        │
│  │   (Nginx)   │ │(Express) │ │             │ │(Storage) │        │
│  │  Port: 80   │ │Port: 3000│ │ Port: 5432  │ │Port: 9000│        │
│  │             │ │          │ │             │ │          │        │
│  │ Namespace:  │ │Namespace:│ │             │ │Namespace:│        │
│  │    salt     │ │   salt   │ │             │ │ storage  │        │
│  └─────────────┘ └────┬─────┘ └──────┬──────┘ └────┬─────┘        │
│                       │              │             │              │
│                       └──────────────┴─────────────┘              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐         │
│  │  Monitoring (Namespace: monitoring)                  │         │
│  │  - Prometheus (metrics)                              │         │
│  │  - Grafana (dashboards)                              │         │
│  └──────────────────────────────────────────────────────┘         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐         │
│  │  Workflows (Namespace: argo)                         │         │
│  │  - Argo Workflows (job orchestration)                │         │
│  └──────────────────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────────────────┘
```

## Infrastructure Components

Salt is deployed on a Raspberry Pi Kubernetes cluster with the following components:

### 1. PostgreSQL Database

**Purpose:** Primary data store for user accounts, sessions, boards, spots, and social interactions.

**Deployment:** Ansible playbook deploys PostgreSQL directly on a dedicated database node (not containerized).

**Database:** `salt_app`

**Key Features:**
- User authentication with bcrypt password hashing
- Session tracking (surf sessions with conditions, ratings, media)
- Board management (user surfboards with specs)
- Social features (likes, comments, follows)
- Spot database (surf locations with coordinates)

**Access:** Backend API connects using service account `salt_app` with read/write permissions.

**Schemas:**
- `auth` - User authentication and profiles
- `public` - Sessions, boards, spots, social interactions

**Documentation:** See `postgres/README.md` and `ansible/README.md`

### 2. MinIO Object Storage

**Purpose:** S3-compatible storage for user-uploaded media files.

**Deployment:** Helm chart in `storage` namespace with 100Gi SSD storage on master node.

**Buckets:**
- `session-media` - Photos and videos from surf sessions (public read)
- `avatars` - User profile pictures (public read)
- `board-photos` - Surfboard images (public read)
- `argo-logs` - Argo Workflows artifacts (private)

**Access:**
- Backend API uploads/manages files via S3 API
- Frontend fetches media directly from MinIO URLs
- Web console available at port 9001

**Storage:** Persistent volume on master node at `/mnt/ssd/minio-data`

**Documentation:** See `helm/minio/README.md`

### 3. Backend API (Express.js)

**Purpose:** RESTful API server handling all business logic and data operations.

**Deployment:** Docker container in `default` namespace, built from `api/salt-api.Dockerfile`.

**Technology Stack:**
- Node.js 20 + Express.js
- TypeScript
- JWT authentication with bcrypt
- PostgreSQL connection pooling
- MinIO S3 client

**Key Features:**
- User authentication (signup, signin, password reset)
- Session CRUD operations
- Board management
- Social interactions (likes, comments, follows)
- File uploads to MinIO
- Health checks (`/health`, `/health/db`)

**Environment:**
- Connects to PostgreSQL via service account
- Uploads files to MinIO buckets
- Serves API at port 3000

**Documentation:** See `api/README.md`

### 4. Frontend Application (React + Vite)

**Purpose:** User-facing web application for surf session tracking.

**Deployment:** Docker container with Nginx serving static files in `default` namespace.

**Technology Stack:**
- React 18 + TypeScript
- Vite build tool
- TailwindCSS + shadcn/ui components
- Mapbox GL JS for maps
- Nginx for serving

**Key Features:**
- User authentication and profiles
- Session logging with photos/videos
- Board management (quiver)
- Spot discovery with interactive maps
- Social feed (likes, comments, follows)
- Responsive design (mobile + desktop)

**Environment:**
- Calls backend API for all data operations
- Fetches media directly from MinIO
- Uses Mapbox API for maps and geocoding
- Serves at port 80

**Documentation:** See `app/README.md`

### 5. Monitoring (Optional)

**Purpose:** Cluster and application metrics collection and visualization.

**Deployment:** Helm charts in `monitoring` namespace.

**Components:**
- **Prometheus** - Metrics collection from all cluster nodes and PostgreSQL
- **Grafana** - Dashboards for visualizing metrics

**Metrics Collected:**
- Node resources (CPU, memory, disk)
- PostgreSQL database stats
- Custom application metrics (future)

**Documentation:** See `helm/prometheus/README.md` and `helm/grafana/README.md`

### 6. Workflow Orchestration (Optional)

**Purpose:** Scheduled job execution and workflow automation.

**Deployment:** Helm chart in `argo` namespace.

**Components:**
- **Argo Workflows** - Kubernetes-native workflow engine
- **CronWorkflows** - Scheduled job execution

**Use Cases:**
- Hourly web scraping jobs
- Data processing pipelines
- Automated maintenance tasks

**Artifact Storage:** Uses MinIO `argo-logs` bucket for workflow artifacts and logs.

**Documentation:** See `helm/argo-workflows/README.md`

## Component Interactions

### User Request Flow

1. **User visits app** → Frontend (Nginx) serves React app
2. **User signs in** → Frontend calls `/api/auth/signin` → Backend validates credentials → Returns JWT token
3. **User creates session** → Frontend calls `/api/sessions` with JWT → Backend validates token → Inserts into PostgreSQL
4. **User uploads photo** → Frontend calls `/api/upload/session-media` → Backend uploads to MinIO → Returns URL
5. **User views feed** → Frontend calls `/api/sessions/public` → Backend queries PostgreSQL → Returns session data with MinIO URLs
6. **User views map** → Frontend uses Mapbox API → Displays spots from `/api/spots`

### Data Flow

**Authentication:**
```
Frontend → Backend API → PostgreSQL (auth.users)
         ← JWT Token ←
```

**Session Creation:**
```
Frontend → Backend API → PostgreSQL (public.sessions)
         ← Session ID ←
```

**Media Upload:**
```
Frontend → Backend API → MinIO (session-media bucket)
         ← Media URL ←
         → PostgreSQL (store URL in session)
```

**Social Interactions:**
```
Frontend → Backend API → PostgreSQL (likes/comments/follows tables)
         ← Updated data ←
```

### Network Communication

**Within Kubernetes:**
- Backend → PostgreSQL: `postgres-service.database.svc.cluster.local:5432`
- Backend → MinIO: `http://master:31000`
- Prometheus → PostgreSQL: Scrapes metrics from database node
- Argo Workflows → MinIO: Stores artifacts in `argo-logs` bucket

**External Access:**
- Users → Frontend: `http://master:80` (or via domain with ingress)
- Frontend → Backend: `/api/*` (proxied or direct)
- Frontend → MinIO: Direct URLs for media (public buckets)
- Frontend → Mapbox: `https://api.mapbox.com` (geocoding, maps)

### Namespace Organization

- **default** - Frontend and Backend applications
- **storage** - MinIO object storage
- **database** - PostgreSQL (bare metal, not in Kubernetes)
- **monitoring** - Prometheus and Grafana
- **argo** - Argo Workflows

This separation provides:
- Resource isolation
- Independent scaling
- Clear security boundaries
- Simplified RBAC management

## Deployment Strategy

### Infrastructure Layer (Ansible)

**PostgreSQL** is deployed directly on a dedicated Raspberry Pi node using Ansible playbooks. This provides:
- Better performance (no container overhead)
- Direct access to node storage
- Simplified backup and maintenance
- Persistent data outside Kubernetes

### Application Layer (Helm)

**MinIO, Prometheus, Grafana, and Argo Workflows** are deployed using Helm charts. This provides:
- Version-controlled configuration
- Easy upgrades and rollbacks
- Consistent deployment across environments
- Kubernetes-native resource management

### Application Deployment (Docker + Kubernetes)

**Frontend and Backend** are containerized and deployed to Kubernetes. This provides:
- Horizontal scaling
- Rolling updates with zero downtime
- Health checks and auto-restart
- Resource limits and requests

### Ingress (Coming Soon)

**Nginx Ingress Controller** will provide:
- Single entry point for all traffic
- TLS termination
- Path-based routing (/api → backend, / → frontend)
- Load balancing across replicas

## Security & Secrets Management

### Environment-Specific Configuration

Environment variables are configured at deployment time:
- **Local development**: Set variables in local `.env` files (gitignored)
- **Docker builds**: Passed as build arguments via GitHub Actions or CLI
- **Kubernetes**: Stored in Kubernetes Secrets and ConfigMaps

### Secrets Storage

**Development:** Environment variables in `.env` files

**Production:** Kubernetes Secrets
- Database credentials
- JWT signing secret
- MinIO access keys
- Mapbox API token

### Authentication Flow

1. User signs up → Password hashed with bcrypt → Stored in PostgreSQL
2. User signs in → Password verified → JWT token issued
3. Subsequent requests → JWT validated → User ID extracted → Request processed
4. Protected routes → JWT required → Ownership verified

### Data Security

- **Passwords:** Bcrypt hashed (never stored in plaintext)
- **JWT Tokens:** Signed with secret, 7-day expiration
- **Database:** Service accounts with limited permissions
- **API:** CORS configured, rate limiting enabled
- **MinIO:** Public read for media, private for artifacts

## Scaling & Performance

### Horizontal Scaling

**Frontend:** Can scale to multiple replicas (stateless)

**Backend:** Can scale to multiple replicas with:
- Shared PostgreSQL connection pool
- Stateless JWT authentication
- Shared MinIO storage

**Database:** Single instance (can be upgraded to primary-replica setup)

**MinIO:** Single instance (can be upgraded to distributed mode)

### Resource Allocation

**Backend API:**
- CPU: 250m request, 500m limit
- Memory: 256Mi request, 512Mi limit
- Connection pool: 20 connections per pod

**Frontend:**
- CPU: 100m request, 200m limit
- Memory: 128Mi request, 256Mi limit

**MinIO:**
- CPU: 250m request, 1000m limit
- Memory: 512Mi request, 2Gi limit
- Storage: 100Gi SSD

### Performance Considerations

- **Database queries:** Indexed on common lookups (user_id, session_id)
- **Media delivery:** Direct from MinIO (bypasses API)
- **Static assets:** Nginx caching for frontend
- **API responses:** Compressed with gzip

## Development Workflow

### Local Development

**Docker Compose:** All services run locally
- PostgreSQL container
- MinIO container
- API container (hot reload)
- Frontend dev server (Vite)

### Deployment to Cluster

1. **Database** - Ansible playbook deploys PostgreSQL
2. **Storage** - Helm chart deploys MinIO
3. **Monitoring** - Helm charts deploy Prometheus/Grafana (optional)
4. **Workflows** - Helm chart deploys Argo (optional)
5. **Application** - Docker images built and deployed to Kubernetes

### Future Enhancements

- **Nginx Ingress** - Single entry point with TLS
- **Redis Caching** - Reduce database load
- **CI/CD Pipeline** - Automated builds and deployments
- **Automated Backups** - Scheduled database backups
- **Distributed MinIO** - Multi-node object storage
- **Read Replicas** - PostgreSQL read scaling

## Documentation

For detailed deployment instructions and configuration:

**Infrastructure:**
- `ansible/README.md` - PostgreSQL deployment
- `helm/README.md` - Kubernetes deployments
- `helm/minio/README.md` - Object storage setup
- `helm/prometheus/README.md` - Monitoring setup
- `helm/argo-workflows/README.md` - Workflow orchestration

**Applications:**
- `api/README.md` - Backend API details
- `app/README.md` - Frontend application details
- `postgres/README.md` - Database schema

**Development:**
- `api/AUTH_IMPLEMENTATION.md` - Authentication details
- `api/REDIS_CACHING.md` - Future caching implementation
