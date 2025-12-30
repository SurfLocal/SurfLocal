# Helm Charts

This directory contains Helm charts for deploying services to the SurfLocal Kubernetes cluster.

## Chart Structure

```
helm/
├── README.md
├── argo-workflows/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── crds/                    # Argo CRDs
│   ├── templates/
│   │   ├── namespace.yaml       # Argo namespace
│   │   ├── configmap.yaml       # Workflow controller config
│   │   ├── controller.yaml      # Argo controller deployment
│   │   ├── rbac.yaml            # Service accounts and roles
│   │   └── workflows/           # CronWorkflow definitions
│   └── charts/
│       └── minio/               # MinIO subchart
│           ├── templates/
│           │   ├── deployment.yaml
│           │   ├── secret.yaml
│           │   └── storage.yaml
│           └── values.yaml
└── prometheus/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── namespace.yaml       # Monitoring namespace
        ├── config.yaml          # Prometheus scrape config
        ├── deployment.yaml
        ├── pv.yaml
        ├── pvc.yaml
        └── service.yaml
```

## Services Overview

| Service | Namespace | Description | Access |
|---------|-----------|-------------|--------|
| **Argo Workflows** | `argo` | Workflow orchestration for scheduled data scraping jobs | Internal only |
| **MinIO** | `argo` | S3-compatible object storage for workflow artifacts and logs | `http://<master-ip>:31000` (API), `http://<master-ip>:31001` (Console) |
| **Prometheus** | `monitoring` | Metrics collection and monitoring | `http://<any-node-ip>:9090` |

## Prerequisites

1. **Kubernetes cluster running** (k3s on Raspberry Pi cluster)
2. **Helm installed** on the master node
3. **kubectl configured** with cluster access
4. **SSD mounted on master** (for MinIO storage)

### Mount SSD for S3 Storage on Master Node

Before deploying Argo Workflows, ensure the SSD is mounted for MinIO S3 storage:

```bash
cd ansible
ansible-playbook playbooks/deploy_s3_storage.yaml
```

This mounts the largest available drive to `/mnt/ssd` on the master node for MinIO object storage.

## Installation

**Important**: Each chart includes a `namespace.yaml` template with Helm pre-install hooks that automatically create the required namespace. You do **not** need to specify `--namespace` or `--create-namespace` flags.

### 1. Apply Argo Workflows CRDs

CRDs must be installed separately before deploying Argo Workflows:

```bash
cd helm/argo-workflows
kubectl apply -k ./crds/
```

### 2. Deploy Argo Workflows

```bash
helm install argo-workflows .
```

This automatically creates the `argo` namespace and deploys all resources including MinIO.

### 3. Deploy Prometheus

```bash
cd ../prometheus
helm install prometheus .
```

This automatically creates the `monitoring` namespace and deploys Prometheus.

## Accessing Services

### MinIO Console

Access the MinIO web console to manage buckets and objects:

```
URL: http://master:31001
Username: admin
Password: fidelio!
```

### MinIO API

S3-compatible API endpoint for programmatic access:

```
Endpoint: http://master:31000
Access Key: admin
Secret Key: fidelio!
```

### Prometheus

Prometheus is accessible only within the cluster (ClusterIP service). Access will be provided through Grafana in a future deployment.

For internal cluster access:
```
Service: prometheus.monitoring.svc.cluster.local:9090
```

To access temporarily from your local machine:
```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Then visit http://localhost:9090
```

## Managing Releases

### List Installed Releases

```bash
helm list -A
```

### Upgrade a Release

After modifying values or templates:

```bash
# Argo Workflows
cd helm/argo-workflows
helm upgrade argo-workflows .

# Prometheus
cd helm/prometheus
helm upgrade prometheus .
```

### Rollback a Release

Roll back to a previous revision:

```bash
# View release history
helm history argo-workflows

# Rollback to specific revision
helm rollback argo-workflows <revision-number>

# Rollback Prometheus
helm rollback prometheus <revision-number>
```

### Uninstall a Release

```bash
# Uninstall Argo Workflows
helm uninstall argo-workflows

# Uninstall Prometheus
helm uninstall prometheus
```

### Delete CRDs (if needed)

CRDs are not removed by `helm uninstall`. To fully remove:

```bash
kubectl delete -k helm/argo-workflows/crds/
```

## Verifying Deployments

### Check Pod Status

```bash
# Argo namespace
kubectl get pods -n argo

# Monitoring namespace
kubectl get pods -n monitoring
```

### Check Persistent Volumes

```bash
kubectl get pv,pvc -A
```

### View Logs

```bash
# Argo controller logs
kubectl logs -n argo -l app=argo-controller

# MinIO logs
kubectl logs -n argo -l app=minio

# Prometheus logs
kubectl logs -n monitoring -l app=prometheus
```

## Troubleshooting

### MinIO PVC Pending

If the MinIO PVC is stuck in `Pending` state:

1. Verify the SSD is mounted on the master node:
   ```bash
   ssh pi@master "df -h | grep /mnt/ssd"
   ```

2. Check PV/PVC binding:
   ```bash
   kubectl describe pv minio-pv
   kubectl describe pvc minio-pvc -n argo
   ```

### Argo CRD Issues

If workflows fail to create:

```bash
kubectl get crds | grep argo
```

Re-apply CRDs if missing:

```bash
kubectl apply -k helm/argo-workflows/crds/
```
