# Grafana Helm Chart

Grafana monitoring dashboards for the SurfLocal Kubernetes cluster.

## Overview

This chart deploys Grafana with:
- Pre-configured Prometheus datasource
- Three custom dashboards for cluster monitoring
- NodePort service for direct localhost access
- Persistent storage for dashboard configurations

## Prerequisites

1. **Kubernetes cluster running** (k3s)
2. **Helm 3.x installed**
3. **Prometheus deployed** in monitoring namespace

## Storage

Grafana uses the `local-path` storage class (k3s default), which dynamically provisions storage on whatever node the pod runs on. It does **not** require the master node SSD.

- **Size**: 5Gi
- **Storage Class**: `local-path`
- **Location**: `/var/lib/rancher/k3s/storage/` on the scheduled node

See [Storage Allocation](../README.md#storage-allocation) in the main helm README for cluster-wide storage planning.

## Installation

### Fresh Install

```bash
helm upgrade --install grafana ./helm/grafana -n monitoring --create-namespace
```

The chart automatically:
- Creates the `monitoring` namespace (if not exists)
- Deploys Grafana with pre-configured dashboards
- Configures Prometheus datasource
- Creates PersistentVolumeClaim for storage

### Upgrading Existing Deployment

```bash
helm upgrade grafana ./helm/grafana -n monitoring
```

## Configuration

### Admin Credentials

Default credentials (change in production):

```yaml
config:
  adminUser: admin
  adminPassword: admin
```

### Datasource

Grafana is pre-configured to connect to Prometheus:

```yaml
config:
  datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus.monitoring.svc.cluster.local:9090
```

### Dashboards

Three dashboards are included:

1. **Raspberry Pi - Machine Metrics**
   - CPU temperature
   - CPU usage
   - System load average
   - Memory usage
   - Disk usage
   - Network traffic

2. **Kubernetes - Cluster Metrics**
   - Nodes online
   - Container CPU and memory usage
   - Resource usage by namespace
   - Network and disk I/O by namespace

3. **PostgreSQL - Database Metrics**
   - Database status
   - Active connections
   - Transactions per second
   - Tuple operations
   - Cache hit ratio
   - Table activity and scans

## Accessing Grafana

### Via NodePort (Default)

Grafana is accessible directly from your localhost:

```
URL: http://master:32000
Username: admin
Password: admin
```

### Via Port-Forward

Alternatively, use kubectl port-forward:

```bash
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

Then visit: http://localhost:3000

## Verification

### Check Deployment Status

```bash
# Check pods
kubectl get pods -n monitoring

# Check service
kubectl get svc -n monitoring
```

### View Dashboards

1. Access Grafana UI
2. Navigate to Dashboards
3. You should see three dashboards:
   - Raspberry Pi - Machine Metrics
   - Kubernetes - Cluster Metrics
   - PostgreSQL - Database Metrics

## Customization

### Change NodePort

```yaml
service:
  nodePort: 32000  # Change to desired port
```

### Disable Dashboards

```yaml
dashboards:
  machineMetrics:
    enabled: false  # Disable machine metrics dashboard
```

### Adjust Resources

```yaml
resources:
  limits:
    cpu: "1000m"
    memory: "1Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"
```

## Troubleshooting

### Grafana Pod Not Starting

Check pod logs:

```bash
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana
```

### Dashboards Not Appearing

1. Check ConfigMaps are created:
   ```bash
   kubectl get configmaps -n monitoring | grep dashboard
   ```

2. Verify dashboard provisioning:
   ```bash
   kubectl exec -n monitoring -it <grafana-pod> -- ls /var/lib/grafana/dashboards
   ```

### Cannot Connect to Prometheus

1. Verify Prometheus is running:
   ```bash
   kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
   ```

2. Test connectivity from Grafana pod:
   ```bash
   kubectl exec -n monitoring -it <grafana-pod> -- wget -O- http://prometheus.monitoring.svc.cluster.local:9090/api/v1/status/config
   ```

## Uninstalling

```bash
# Uninstall chart
helm uninstall grafana -n monitoring

# Remove PVC (optional)
kubectl delete pvc grafana -n monitoring
```

## Values Reference

See [STANDARDS.md](../STANDARDS.md) for complete values structure.

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `metadata.namespace` | Namespace for deployment | `monitoring` |
| `service.type` | Service type | `NodePort` |
| `service.nodePort` | NodePort for external access | `32000` |
| `config.adminUser` | Admin username | `admin` |
| `config.adminPassword` | Admin password | `admin` |
| `persistence.size` | Storage size | `5Gi` |

## Related Documentation

- [Helm Chart Standards](../STANDARDS.md)
- [Prometheus Chart](../prometheus/README.md)
- [Grafana Documentation](https://grafana.com/docs/)
