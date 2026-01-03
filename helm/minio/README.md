# MinIO Helm Chart

MinIO object storage for Argo Workflows artifact repository in the Salt Kubernetes cluster.

## Overview

This chart deploys MinIO with:
- S3-compatible object storage for Argo Workflows artifacts
- Persistent storage on SSD mounted to master node
- NodePort service for external access
- Automated bucket creation for workflow logs
- Health checks and resource management

## Prerequisites

1. **Kubernetes cluster running** (k3s)
2. **Helm 3.x installed**
3. **SSD storage configured** on master node via Ansible

### Configure S3 Storage via Ansible

The SSD storage for MinIO is automatically configured using Ansible. The playbook handles:
- Detecting the largest available drive
- Formatting and mounting the drive to `/mnt/ssd`
- Creating the MinIO data directory at `/mnt/ssd/minio-data`
- Setting appropriate permissions
- Persisting the mount in `/etc/fstab`

**Deploy S3 storage:**

```bash
cd ../../ansible

# Run the S3 storage playbook on master node
ansible-playbook playbooks/deploy_s3_storage.yaml
```

**What the Ansible playbook does:**

1. **Finds the largest available drive** - Automatically detects the best storage device
2. **Creates mount point** - Sets up `/mnt/ssd` directory
3. **Formats the drive** - Uses ext4 filesystem if not already formatted
4. **Mounts the drive** - Mounts to `/mnt/ssd` with optimized options (`noatime`)
5. **Creates symlink** - Links device to `/dev/ssd` for easier reference
6. **Persists configuration** - Adds entry to `/etc/fstab` for automatic mounting on reboot
7. **Creates MinIO directory** - Sets up `/mnt/ssd/minio-data` with proper permissions

See `@/Users/robronayne/Desktop/Git/Salt/ansible/roles/s3_storage/tasks/main.yaml` for implementation details.

## Installation

### Quick Start

```bash
cd helm/argo-workflows/charts/minio
helm upgrade --install minio . -n argo --create-namespace
```

The chart automatically:
- Creates the `argo` namespace
- Deploys MinIO server with S3 API
- Creates PersistentVolume and PersistentVolumeClaim
- Configures NodePort service for external access
- Sets up credentials for authentication

### Custom Installation

Override values during installation:

```bash
helm upgrade --install minio . -n argo \
  --set resources.limits.memory=4Gi \
  --set persistence.size=200Gi
```

## Configuration

### Storage Configuration

```yaml
persistence:
  enabled: true
  size: 100Gi
  storageClass: "minio-storage"
  persistentVolume:
    enabled: true
    hostPath: "/mnt/ssd/minio-data"
    nodeAffinity:
      required:
        nodeSelectorTerms:
          - matchExpressions:
              - key: kubernetes.io/hostname
                operator: In
                values:
                  - master
```

### Resource Limits

```yaml
resources:
  limits:
    cpu: "1000m"
    memory: "2Gi"
  requests:
    cpu: "250m"
    memory: "512Mi"
```

### Service Configuration

```yaml
service:
  type: NodePort
  ports:
    - name: api
      port: 9000
      nodePort: 31000
    - name: console
      port: 9001
      nodePort: 31001
```

## Verification

### Check Deployment Status

```bash
# Check pods
kubectl get pods -n argo

# Check services
kubectl get svc -n argo

# Check PV/PVC
kubectl get pv,pvc -n argo
```

### Verify Storage Mount

```bash
# SSH to master node and check mount
ssh master 'df -h | grep minio'
```

## Accessing MinIO

### MinIO Console (Web UI)

**Port-forward method:**

```bash
kubectl port-forward -n argo svc/minio 9001:9001
```

Then visit: http://localhost:9001

**Direct access via NodePort:**

```
http://<master-node-ip>:31001
```

**Login credentials:**
- Access Key: `admin`
- Secret Key: `<configured-in-values.yaml>`

### MinIO API (S3)

**Port-forward method:**

```bash
kubectl port-forward -n argo svc/minio 9000:9000
```

**Direct access via NodePort:**

```
http://<master-node-ip>:31000
```

### Internal Cluster Access

From within the cluster:
```
http://minio.argo.svc.cluster.local:9000
```

## Usage Examples

### Configure AWS CLI for MinIO

```bash
aws configure --profile minio
# AWS Access Key ID: admin
# AWS Secret Access Key: <your-minio-secret-key>
# Default region name: us-east-1
# Default output format: json

# Set endpoint
export AWS_ENDPOINT_URL=http://localhost:9000
```

### List Buckets

```bash
aws --profile minio --endpoint-url http://localhost:9000 s3 ls
```

### Upload File

```bash
aws --profile minio --endpoint-url http://localhost:9000 s3 cp file.txt s3://argo-logs/
```

### Download File

```bash
aws --profile minio --endpoint-url http://localhost:9000 s3 cp s3://argo-logs/file.txt .
```

## Why Configure Storage on Master Node?

### **Dedicated Storage**
The SSD provides dedicated, high-performance storage for MinIO. Using the master node with exclusive access ensures storage is always available and optimized.

### **Improved Performance**
SSDs offer faster read/write speeds compared to standard drives or network storage. Local SSD reduces network I/O overhead, significantly improving MinIO performance.

### **Simplified Architecture**
For small clusters and testing environments, single-node storage simplifies setup and reduces complexity while maintaining good performance.

### **Resource Optimization**
The master node handles cluster management and is ideal for dedicated services like MinIO, freeing worker nodes for application workloads.

---

## Argo Workflows Integration

### Logging Configuration

Argo Workflows logs are stored in MinIO and organized by job name, date, and time (UTC). Logs are sent to the `argo-logs` bucket with paths dynamically generated by workflow scripts.

**Log path structure:**

```
argo-logs/<job_name>/<MM-DD-YYYY>/<HH-MM>.log
```

**Components:**
- `job_name`: Workflow job name (e.g., "swell-scraper")
- `date_str`: Date in `MM-DD-YYYY` format (e.g., "03-18-2025")
- `time_str`: Time in `HH-MM` format (e.g., "14-30")

**Example:**

```
argo-logs/swell-scraper/03-18-2025/14-30.log
argo-logs/wind-scraper/03-18-2025/14-30.log
```

All timestamps are in UTC for consistency across the cluster.

### Accessing Workflow Logs

**Via MinIO Console:**

1. Port-forward the MinIO service:
   ```bash
   kubectl port-forward -n argo svc/minio 9001:9001
   ```

2. Open browser to http://localhost:9001

3. Login with credentials (admin/<your-minio-secret-key>)

4. Navigate to `argo-logs` bucket

5. Browse logs by job name → date → time

**Via AWS CLI:**

```bash
# List all logs for a specific job
aws --profile minio --endpoint-url http://localhost:9000 s3 ls s3://argo-logs/swell-scraper/ --recursive

# Download specific log
aws --profile minio --endpoint-url http://localhost:9000 s3 cp s3://argo-logs/swell-scraper/03-18-2025/14-30.log .
```

## Upgrading

### Update Configuration

Modify `values.yaml` and upgrade:

```bash
helm upgrade minio . -n argo
```

### Increase Storage Size

Edit `values.yaml`:

```yaml
persistence:
  size: 200Gi
```

Then upgrade:

```bash
helm upgrade minio . -n argo
```

Note: You may need to manually resize the PV and underlying storage.

## Troubleshooting

### Pod Not Starting

1. Check pod status:
   ```bash
   kubectl describe pod -n argo -l app.kubernetes.io/name=minio
   ```

2. Verify storage mount on master node:
   ```bash
   ssh master 'ls -la /mnt/ssd/minio-data'
   ```

3. Check PV/PVC binding:
   ```bash
   kubectl get pv,pvc -n argo
   ```

### Storage Not Mounting

1. Verify Ansible playbook ran successfully:
   ```bash
   ssh master 'df -h | grep /mnt/ssd'
   ```

2. Re-run Ansible if needed:
   ```bash
   cd ../../ansible
   ansible-playbook playbooks/deploy_s3_storage.yaml
   ```

3. Check node affinity matches:
   ```bash
   kubectl get nodes --show-labels | grep hostname
   ```

### Cannot Access Console

1. Verify service is running:
   ```bash
   kubectl get svc -n argo minio
   ```

2. Check NodePort is accessible:
   ```bash
   curl http://<master-ip>:31001
   ```

3. Verify credentials in secret:
   ```bash
   kubectl get secret -n argo minio-creds -o yaml
   ```

## Uninstalling

```bash
helm uninstall minio -n argo
```

**Note:** PVs and storage data are not automatically deleted. To remove:

```bash
# Delete PV
kubectl delete pv minio-pv

# Delete storage class
kubectl delete storageclass minio-storage

# Manually clean data on master node (optional)
ssh master 'sudo rm -rf /mnt/ssd/minio-data/*'
```

## Values Reference

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `metadata.namespace` | Namespace for deployment | `argo` |
| `deployment.replicaCount` | Number of replicas | `1` |
| `resources.limits.memory` | Memory limit | `2Gi` |
| `resources.limits.cpu` | CPU limit | `1000m` |
| `persistence.size` | Storage size | `100Gi` |
| `persistence.storageClass` | Storage class name | `minio-storage` |
| `service.type` | Service type | `NodePort` |
| `credentials.accessKey` | MinIO access key | `admin` |
| `credentials.secretKey` | MinIO secret key | `<configured-in-values.yaml>` |

## Related Documentation

- [Helm Chart Standards](../../STANDARDS.md)
- [Argo Workflows Chart](../../README.md)
- [MinIO Documentation](https://min.io/docs/minio/kubernetes/upstream/)
- [Ansible S3 Storage Role](../../../ansible/roles/s3_storage/)
