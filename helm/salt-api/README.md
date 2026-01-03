# Salt API Helm Chart

Backend API service for the Salt surf session tracking application.

## Overview

This chart deploys the Salt API backend service, which provides:
- User authentication (JWT-based)
- Session management (CRUD operations)
- Board/quiver management
- Social features (follows, likes, comments)
- File uploads to MinIO storage

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PostgreSQL database (deployed via Ansible or external)
- MinIO storage (deployed via `helm/minio` chart)

## Installation

```bash
# Install with required secrets
helm install salt-api ./helm/salt-api \
  --set secrets.databasePassword=your_db_password \
  --set secrets.minioSecretKey=your_minio_secret \
  --set secrets.jwtSecret=$(openssl rand -base64 32)
```

## Configuration

### Required Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.databasePassword` | PostgreSQL password | `""` |
| `secrets.minioSecretKey` | MinIO secret key | `""` |
| `secrets.jwtSecret` | JWT signing secret | `""` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.database.host` | Database hostname | `postgres` |
| `config.database.port` | Database port | `5432` |
| `config.database.name` | Database name | `salt_app` |
| `config.database.user` | Database user | `salt_app` |
| `config.database.maxConnections` | Max pool connections | `20` |

### MinIO Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.minio.endpoint` | MinIO hostname | `master` |
| `config.minio.port` | MinIO API port | `31000` |
| `config.minio.accessKey` | MinIO access key | `admin` |
| `config.minio.useSSL` | Use SSL connection | `false` |

### Resource Limits

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `500m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |

### Deployment

| Parameter | Description | Default |
|-----------|-------------|---------|
| `deployment.replicaCount` | Number of replicas | `1` |
| `image.repository` | Docker image | `surflocally/salt-api` |
| `image.tag` | Image tag | `latest` |

## Upgrading

```bash
helm upgrade salt-api ./helm/salt-api \
  --set secrets.databasePassword=your_db_password \
  --set secrets.minioSecretKey=your_minio_secret \
  --set secrets.jwtSecret=your_existing_jwt_secret
```

## Uninstalling

```bash
helm uninstall salt-api
```

## Health Checks

The API exposes a `/health` endpoint for liveness and readiness probes.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Salt API   │────▶│ PostgreSQL  │
│  (salt-app) │     │  (Express)  │     │  Database   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    MinIO    │
                    │  (Storage)  │
                    └─────────────┘
```
