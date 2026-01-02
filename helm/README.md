# Helm Charts

This directory contains Helm charts for deploying services to the Salt Kubernetes cluster.

## Documentation

- **[STANDARDS.md](./STANDARDS.md)** - Helm chart standardization guide and conventions
- **[Prometheus Chart](./prometheus/README.md)** - Monitoring and metrics collection
- **[Argo Workflows Chart](./argo-workflows/README.md)** - Workflow orchestration and scheduling

## Quick Links

- [Installation](#installation)
- [Accessing Services](#accessing-services)
- [Managing Releases](#managing-releases)
- [Troubleshooting](#troubleshooting)

## Available Charts

### Prometheus
**Namespace:** `monitoring`  
**Description:** Monitoring system and time series database  
**Documentation:** [prometheus/README.md](./prometheus/README.md)

**Features:**
- Metrics collection from all cluster nodes
- PostgreSQL database monitoring
- Configurable scrape targets
- 15-day retention

### Argo Workflows
**Namespace:** `argo`  
**Description:** Workflow orchestration engine  
**Documentation:** [argo-workflows/README.md](./argo-workflows/README.md)

**Features:**
- Scheduled workflow execution
- Hourly web scraping jobs
- MinIO integration for log storage
- Workflow artifact management

### MinIO (Subchart)
**Namespace:** `argo`  
**Description:** S3-compatible object storage  
**Parent Chart:** Argo Workflows

**Features:**
- Workflow log storage
- Artifact repository
- Web console for bucket management
- 100Gi SSD storage

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

## Storage Allocation

### Current Storage Usage

| Deployment | Namespace | Size | Storage Class | Node Affinity |
|------------|-----------|------|---------------|---------------|
| MinIO | `argo` | 100Gi | `minio-storage` | Master (SSD) |
| Prometheus | `monitoring` | 10Gi | `local-path` | Any |
| Grafana | `monitoring` | 5Gi | `local-path` | Any |

### Storage Classes

- **`minio-storage`**: Manual provisioner using hostPath on master node SSD (`/mnt/ssd/minio-data`). Only MinIO uses this.
- **`local-path`**: k3s default dynamic provisioner. Stores data on whatever node the pod runs on at `/var/lib/rancher/k3s/storage/`.

### Check Available Storage

**Master node SSD (MinIO):**
```bash
ssh pi@master "df -h /mnt/ssd"
```

**All PVs and PVCs:**
```bash
kubectl get pv,pvc -A
```

**Storage by node:**
```bash
# Check local-path storage on each node
ansible all -m shell -a "df -h /var/lib/rancher/k3s/storage 2>/dev/null || echo 'No k3s storage'"
```

### Planning New Deployments

Before adding new deployments with persistent storage:

1. Check current PV/PVC usage with `kubectl get pv,pvc -A`
2. Verify available disk space on target nodes
3. Choose appropriate storage class:
   - Use `minio-storage` only for MinIO (master SSD)
   - Use `local-path` for general workloads (dynamic provisioning)

## Installation

**Important**: Each chart includes a `namespace.yaml` template with Helm pre-install hooks that automatically create the required namespace.

### Fresh Install

For a brand new cluster or first-time deployment:

#### 1. Install Argo Workflows CRDs

CRDs must be installed before deploying Argo Workflows:

```bash
cd helm/argo-workflows
kubectl apply -k ./.crds/
```

Verify CRDs are installed:

```bash
kubectl get crds | grep argoproj.io
```

#### 2. Deploy Prometheus

```bash
helm upgrade --install prometheus ./helm/prometheus -n monitoring --create-namespace
```

#### 3. Deploy Argo Workflows

```bash
helm upgrade --install argo-workflows ./helm/argo-workflows --create-namespace
```

This deploys:
- Argo Workflows controller
- MinIO object storage (100Gi)
- Scheduled CronWorkflows
- MinIO buckets (via Helm hook)

### Upgrading Existing Deployments

After modifying `values.yaml` or templates:

```bash
# Upgrade Prometheus
helm upgrade prometheus ./helm/prometheus -n monitoring

# Upgrade Argo Workflows
helm upgrade argo-workflows ./helm/argo-workflows
```

If CRDs need updating:

```bash
kubectl apply -k ./helm/argo-workflows/.crds/
```

## Accessing Services

### Prometheus

Prometheus is accessible via ClusterIP service within the cluster.

**Port-forward for local access:**
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```
Then visit: http://localhost:9090

**Internal cluster access:**
```
http://prometheus.monitoring.svc.cluster.local:9090
```

### MinIO Console

Access the MinIO web console:

```
URL: http://master:31001
Username: admin
Password: fidelio!
```

### MinIO S3 API

S3-compatible API endpoint:

```
Endpoint: http://master:31000
Access Key: admin
Secret Key: fidelio!
```

### Argo Workflows

View workflows using kubectl:

```bash
# List all workflows
kubectl get workflows -n argo

# List scheduled workflows
kubectl get cronworkflows -n argo

# View workflow logs
argo logs -n argo <workflow-name>
```

## Managing Releases

### List Installed Releases

```bash
helm list -A
```

### Upgrade a Release

See [Upgrading Existing Deployments](#upgrading-existing-deployments) above.

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
# Uninstall Prometheus
helm uninstall prometheus -n monitoring

# Uninstall Argo Workflows
helm uninstall argo-workflows
```

### Delete CRDs (if needed)

CRDs are not removed by `helm uninstall`. To fully remove:

```bash
kubectl delete -k helm/argo-workflows/.crds/
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
# Prometheus logs
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus

# Argo controller logs
kubectl logs -n argo -l app.kubernetes.io/component=controller

# MinIO logs
kubectl logs -n argo -l app.kubernetes.io/name=minio
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
   kubectl describe pv argo-workflows-minio-pv
   kubectl describe pvc argo-workflows-minio-pvc -n argo
   ```

### Argo CRD Issues

If workflows fail to create:

```bash
kubectl get crds | grep argoproj.io
```

Re-apply CRDs if missing:

```bash
kubectl apply -k helm/argo-workflows/.crds/
```

### Bucket Creator Job Already Exists

If you see "job already exists" error during upgrade:

```bash
kubectl delete job -n argo -l helm.sh/hook
helm upgrade argo-workflows ./helm/argo-workflows
```
