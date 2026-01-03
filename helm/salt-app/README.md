# Salt App Helm Chart

Frontend application for the Salt surf session tracking platform.

## Overview

This chart deploys the Salt frontend application, which provides:
- User interface for session logging
- Dashboard with statistics and activity
- Social features (feed, connections, profiles)
- Maps and spot reports
- Quiver management

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Salt API backend (deployed via `helm/salt-api` chart)

## Installation

```bash
# Install with default values
helm install salt-app ./helm/salt-app
```

## Configuration

### Image Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Docker image repository | `surflocally/salt-app` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `NodePort` |
| `service.ports[0].port` | Service port | `80` |
| `service.ports[0].nodePort` | NodePort for external access | `30080` |

### Resource Limits

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.limits.cpu` | CPU limit | `200m` |
| `resources.limits.memory` | Memory limit | `128Mi` |
| `resources.requests.cpu` | CPU request | `50m` |
| `resources.requests.memory` | Memory request | `64Mi` |

### Deployment

| Parameter | Description | Default |
|-----------|-------------|---------|
| `deployment.replicaCount` | Number of replicas | `1` |

## Accessing the Application

After installation, the application is available at:

```
http://master:30080
```

Or use kubectl port-forward for local access:

```bash
kubectl port-forward svc/salt-app 8080:80 -n default
```

Then access at `http://localhost:8080`.

## Upgrading

```bash
helm upgrade salt-app ./helm/salt-app
```

## Uninstalling

```bash
helm uninstall salt-app
```

## Architecture

```
                    ┌─────────────────────────────────┐
                    │         Salt Frontend           │
                    │         (Nginx + React)         │
                    │         Port: 30080             │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │          Salt API               │
                    │        (Express.js)             │
                    │         Port: 3000              │
                    └─────────────────────────────────┘
```

## Notes

- The frontend is built with React + Vite and served via Nginx
- Static assets are served with appropriate caching headers
- The `/health` endpoint is used for health checks
- API calls are configured at build time via environment variables
