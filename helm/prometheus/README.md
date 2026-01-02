# Prometheus Helm Chart

Prometheus monitoring system and time series database for the Salt Kubernetes cluster.

## Overview

This chart deploys Prometheus with:
- Metrics collection from all cluster nodes (Node Exporter)
- PostgreSQL database monitoring (PostgreSQL Exporter)
- Configurable scrape targets
- Persistent storage for metrics
- 15-day retention policy

## Prerequisites

1. **Kubernetes cluster running** (k3s)
2. **Helm 3.x installed**
3. **Node Exporter running** on all nodes
4. **PostgreSQL Exporter running** on postgres host
5. **CoreDNS configured** for hostname resolution

### Install Exporters via Ansible

```bash
cd ../../ansible

# Deploy Node Exporter to all nodes
ansible-playbook playbooks/deploy_node_exporter.yaml

# Deploy PostgreSQL Exporter to postgres host
ansible-playbook playbooks/deploy_postgres_exporter.yaml
```

## Installation

### Fresh Install

For a brand new cluster or first-time deployment:

```bash
helm upgrade --install prometheus ./helm/prometheus -n monitoring --create-namespace
```

The chart automatically:
- Creates the `monitoring` namespace (via Helm hook)
- Deploys Prometheus server with configured scrape targets
- Creates PersistentVolume and PersistentVolumeClaim
- Configures service for cluster access

### Upgrading Existing Deployment

After modifying `values.yaml` or templates:

```bash
helm upgrade prometheus ./helm/prometheus -n monitoring
```

### Custom Installation

Override values during installation:

```bash
helm upgrade --install prometheus ./helm/prometheus -n monitoring --create-namespace \
  --set resources.limits.memory=4Gi \
  --set retention.time=30d
```

## Configuration

### Scrape Targets

Configured in `values.yaml`:

```yaml
config:
  scrapeConfigs:
    - jobName: prometheus
      targets:
        - localhost:9090
    
    - jobName: raspberry-pi-nodes
      targets:
        - master:9100
        - worker1:9100
        - worker2:9100
        - worker3:9100
        - postgres:9100
    
    - jobName: postgres
      targets:
        - postgres:9187
```

### Storage Configuration

```yaml
persistence:
  enabled: true
  size: 10Gi
  existingClaim: "prometheus-pvc"
  persistentVolume:
    enabled: true
    hostPath: "/mnt/ssd/prometheus-data"
```

### Resource Limits

```yaml
resources:
  limits:
    cpu: "1000m"
    memory: "2Gi"
  requests:
    cpu: "500m"
    memory: "1Gi"
```

## Verification

### Check Deployment Status

```bash
# Check pods
kubectl get pods -n monitoring

# Check services
kubectl get svc -n monitoring

# Check PV/PVC
kubectl get pv,pvc -n monitoring
```

### Verify Scrape Targets

```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Check targets via API
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {instance: .labels.instance, health: .health}'
```

## Accessing Prometheus

### Port-Forward (Recommended)

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
```

Then visit: http://localhost:9090

### Internal Cluster Access

From within the cluster:
```
http://prometheus.monitoring.svc.cluster.local:9090
```

## Usage Examples

### Query All Targets Status

```promql
up
```

Expected output:
```
up{instance="postgres:9187", job="postgres"} 1
up{instance="postgres:9100", job="raspberry-pi-nodes"} 1
up{instance="master:9100", job="raspberry-pi-nodes"} 1
up{instance="worker1:9100", job="raspberry-pi-nodes"} 1
up{instance="worker2:9100", job="raspberry-pi-nodes"} 1
up{instance="worker3:9100", job="raspberry-pi-nodes"} 1
up{instance="localhost:9090", job="prometheus"} 1
```

### Node CPU Usage

```promql
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### PostgreSQL Connections

```promql
pg_stat_database_numbackends{datname="surf_analytics"}
```

### Memory Usage

```promql
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100
```

## Upgrading

### Update Configuration

Modify `values.yaml` and upgrade:

```bash
helm upgrade prometheus . -n monitoring
```

### Add New Scrape Target

Edit `values.yaml`:

```yaml
config:
  scrapeConfigs:
    - jobName: my-app
      targets:
        - my-app:8080
```

Then upgrade:

```bash
helm upgrade prometheus . -n monitoring
```

## Troubleshooting

### Targets Not Showing Up

1. Check CoreDNS is resolving hostnames:
   ```bash
   kubectl exec -n monitoring deployment/prometheus -- nslookup postgres
   ```

2. Verify exporters are running:
   ```bash
   ssh postgres 'systemctl status node_exporter postgres_exporter'
   ```

3. Check Prometheus logs:
   ```bash
   kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus
   ```

### PVC Pending

If using existing PVC, ensure it exists:
```bash
kubectl get pvc -n monitoring
```

### High Memory Usage

Increase resource limits:
```yaml
resources:
  limits:
    memory: "4Gi"
```

## Uninstalling

```bash
helm uninstall prometheus -n monitoring
```

Note: PVs are not automatically deleted. To remove:
```bash
kubectl delete pv prometheus-pv
```

## Values Reference

See [STANDARDS.md](../STANDARDS.md) for complete values structure.

### Key Configuration Options

| Parameter | Description | Default |
|-----------|-------------|----------|
| `metadata.namespace` | Namespace for deployment | `monitoring` |
| `deployment.replicaCount` | Number of replicas | `1` |
| `resources.limits.memory` | Memory limit | `2Gi` |
| `retention.time` | Metrics retention period | `15d` |
| `persistence.size` | Storage size | `10Gi` |
| `config.scrapeInterval` | Scrape interval | `15s` |

## Related Documentation

- [Helm Chart Standards](../STANDARDS.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
