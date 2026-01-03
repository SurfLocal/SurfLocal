# Argo Workflows Helm Chart

Workflow orchestration engine for scheduling and executing parallel jobs on Kubernetes.

## Overview

This chart deploys:
- Argo Workflows controller for workflow orchestration
- MinIO for S3-compatible object storage
- Scheduled CronWorkflows for hourly data scraping
- Automated MinIO bucket creation
- RBAC resources with service accounts

## Prerequisites

1. **Kubernetes cluster running** (k3s)
2. **Helm 3.x installed**
3. **SSD mounted on master node** at `/mnt/ssd`
4. **Argo Workflows CRDs installed**
5. **Web scraper Docker image** available

### Mount SSD Storage

Deploy via Ansible:

```bash
cd ../../ansible
ansible-playbook playbooks/deploy_s3_storage.yaml
```

## Installation

### Fresh Install

For a brand new cluster or first-time deployment:

#### Step 1: Install CRDs

CRDs must be installed before the Helm chart:

```bash
cd helm/argo-workflows
kubectl apply -k ./.crds/
```

Verify:

```bash
kubectl get crds | grep argoproj.io
```

Expected output:
```
cronworkflows.argoproj.io
workflows.argoproj.io
workflowtemplates.argoproj.io
clusterworkflowtemplates.argoproj.io
```

#### Step 2: Deploy Chart

```bash
helm upgrade --install argo-workflows . --create-namespace
```

The chart automatically:
- Creates the `argo` namespace (via Helm hook)
- Deploys Argo Workflows controller
- Deploys MinIO with 100Gi storage
- Creates MinIO buckets (via Helm hook)
- Deploys scheduled CronWorkflows

### Upgrading Existing Deployment

After modifying `values.yaml` or templates:

```bash
helm upgrade argo-workflows .
```

If CRDs need updating:

```bash
kubectl apply -k ./.crds/
```

### Custom Installation

Override values:

```bash
helm upgrade --install argo-workflows . --create-namespace \
  --set controller.replicaCount=2 \
  --set workflows.hourly.schedule="0 */2 * * *"
```

## Configuration

### Workflow Schedules

Configured in `values.yaml`:

```yaml
workflows:
  hourly:
    enabled: true
    schedule: "0 * * * *"
    timezone: "America/Los_Angeles"
    
    jobs:
      - name: swell-scraper-hourly
        enabled: true
      - name: wind-scraper-hourly
        enabled: true
```

### MinIO Configuration

```yaml
minio:
  enabled: true
  ports:
    nodeApi: 31000
  buckets:
    - argo-logs
```

### Controller Resources

```yaml
controller:
  resources:
    limits:
      cpu: "500m"
      memory: "512Mi"
    requests:
      cpu: "250m"
      memory: "256Mi"
```

## Verification

### Check Deployment Status

```bash
# Check all resources
kubectl get all -n argo

# Check CronWorkflows
kubectl get cronworkflows -n argo

# Check workflows
kubectl get workflows -n argo
```

### Verify MinIO Buckets

```bash
# Install MinIO client
brew install minio/stable/mc

# Configure alias (use your MinIO credentials)
mc alias set minio http://master:31000 <access-key> <secret-key>

# List buckets
mc ls minio
```

## Accessing Services

### MinIO Console

Web interface for bucket management:

```
URL: http://master:31001
Username: admin
Password: <your-minio-secret-key>
```

### MinIO S3 API

Programmatic access:

```
Endpoint: http://master:31000
Access Key: admin
Secret Key: <your-minio-secret-key>
```

## Managing Workflows

### View Workflows

```bash
# List all workflows
kubectl get workflows -n argo

# List CronWorkflows
kubectl get cronworkflows -n argo

# Describe a workflow
kubectl describe workflow <workflow-name> -n argo
```

### View Workflow Logs

```bash
# Using kubectl
kubectl logs -n argo <workflow-pod-name>

# Using argo CLI (if installed)
argo logs -n argo <workflow-name>
```

### Trigger Manual Workflow

```bash
argo submit -n argo --from cronworkflow/swell-scraper-hourly
```

## Adding New Workflows

### 1. Update values.yaml

```yaml
workflows:
  daily:
    enabled: true
    schedule: "0 0 * * *"
    timezone: "America/Los_Angeles"
    
    jobs:
      - name: daily-cleanup
        enabled: true
```

### 2. Create Workflow Template

Create `templates/workflows/daily.yaml` following the pattern in `hourly.yaml`.

### 3. Deploy

```bash
helm upgrade argo-workflows .
```

## Troubleshooting

### CronWorkflow Not Running

1. Check CronWorkflow status:
   ```bash
   kubectl describe cronworkflow <name> -n argo
   ```

2. Check controller logs:
   ```bash
   kubectl logs -n argo -l app.kubernetes.io/component=controller
   ```

3. Verify schedule syntax:
   ```bash
   kubectl get cronworkflow <name> -n argo -o yaml | grep schedule
   ```

### MinIO PVC Pending

1. Verify SSD is mounted:
   ```bash
   ssh master "df -h | grep /mnt/ssd"
   ```

2. Check PV/PVC status:
   ```bash
   kubectl get pv,pvc -n argo
   kubectl describe pvc argo-workflows-minio-pvc -n argo
   ```

### Workflow Fails

1. Check workflow status:
   ```bash
   kubectl get workflow <name> -n argo
   ```

2. View logs:
   ```bash
   kubectl logs -n argo <workflow-pod-name>
   ```

3. Check image pull:
   ```bash
   kubectl describe pod <workflow-pod-name> -n argo
   ```

## Upgrading

### Update Workflow Configuration

```bash
# Edit values.yaml
vim values.yaml

# Upgrade
helm upgrade argo-workflows .
```

### Update CRDs

```bash
kubectl apply -k ./.crds/
```

### Bucket Creator Job Already Exists

If you see "job already exists" error during upgrade:

```bash
kubectl delete job -n argo -l helm.sh/hook
helm upgrade argo-workflows .
```

## Uninstalling

```bash
# Uninstall chart
helm uninstall argo-workflows

# Remove CRDs (optional)
kubectl delete -k ./.crds/

# Remove PVs (optional)
kubectl delete pv argo-workflows-minio-pv
```

## Values Reference

See [STANDARDS.md](../STANDARDS.md) for complete values structure.

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|----------|
| `metadata.namespace` | Namespace for deployment | `argo` |
| `controller.replicaCount` | Controller replicas | `1` |
| `workflows.hourly.schedule` | Cron schedule | `0 * * * *` |
| `workflows.hourly.timezone` | Timezone for schedules | `America/Los_Angeles` |
| `minio.enabled` | Enable MinIO subchart | `true` |
| `minio.buckets` | Buckets to create | `[argo-logs]` |

## Components

### Argo Workflows Controller
- Orchestrates workflow execution
- Manages CronWorkflows
- Handles workflow lifecycle

### MinIO
- S3-compatible object storage
- 100Gi SSD storage
- Workflow log storage
- Artifact repository

### Scheduled Workflows
- **swell-scraper-hourly**: Hourly swell data collection
- **wind-scraper-hourly**: Hourly wind data collection

## Related Documentation

- [Helm Chart Standards](../STANDARDS.md)
- [Argo Workflows Documentation](https://argoproj.github.io/argo-workflows/)
- [MinIO Documentation](https://min.io/docs/minio/kubernetes/upstream/)

## Notes

- **Argo UI**: Not deployed in this configuration
- **Logging**: Workflows upload logs to MinIO via boto3
- **Future**: OpenSearch integration planned for log analysis
