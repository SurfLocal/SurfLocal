# Argo Workflows Helm Chart

This chart deploys Argo Workflows with MinIO for artifact and log storage.

## Prerequisites

1. **Kubernetes cluster running** (k3s on Raspberry Pi cluster)
2. **SSD mounted on master node** at `/mnt/ssd` for MinIO storage
3. **kubectl configured** with cluster access

### Mount SSD Storage

Before deploying, ensure the SSD is mounted:

```bash
cd ../../ansible
ansible-playbook playbooks/deploy_s3_storage.yaml
```

## Installation

### Step 1: Apply CRDs

CRDs must be installed separately before deploying the Helm chart:

```bash
kubectl apply -k ./crds/
```

Verify CRDs are installed:

```bash
kubectl get crds | grep argo
```

You should see: `cronworkflows.argoproj.io`, `workflows.argoproj.io`, `workflowtemplates.argoproj.io`, etc.

### Step 2: Deploy Chart

The chart automatically creates the `argo` namespace using Helm pre-install hooks:

```bash
helm install argo-workflows .
```

This deploys:
- Argo Workflows controller
- MinIO (S3-compatible storage)
- RBAC resources
- CronWorkflows for scheduled jobs

## Components

### Argo Workflows Controller
- Orchestrates workflow execution
- Manages CronWorkflows for scheduled data scraping

### MinIO
- S3-compatible object storage
- Stores workflow artifacts and logs
- Runs on master node with SSD storage
- **Storage**: 100Gi at `/mnt/ssd/minio-data`
- **Access**: 
  - API: `http://master:31000`
  - Console: `http://master:31001`
  - Credentials: `admin` / `fidelio!`

### CronWorkflows
- `swell-scraper-hourly`: Runs hourly swell data collection
- `wind-scraper-hourly`: Runs hourly wind data collection

### Argo UI Status
The Argo Server UI has **not** been deployed due to a metadata issue that arose after initializing the PostgreSQL database. The Argo controller attempted to query a column that did not exist in the workflows tables, which led to various UI features failing and rendering the UI essentially useless. This issue also prevented persistence from being enabled, as tracking previous workflow runs was not possible. Since the UI is a low-priority item, it has been omitted from this deployment. Artifact storage is already configured via `boto3`, which uploads logs to MinIO.

### Future Logging Strategy

Workflow execution logs are currently being ingested in JSON format. In a future update, log tracking and analysis will be handled via OpenSearch, providing a more structured and efficient method for monitoring workflow execution.
