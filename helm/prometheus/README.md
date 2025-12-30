# Prometheus Helm Chart

This chart deploys Prometheus for monitoring the Raspberry Pi cluster.

## Prerequisites

1. **Kubernetes cluster running** (k3s on Raspberry Pi cluster)
2. **Node Exporter installed** on all nodes (deployed via Ansible)
3. **kubectl configured** with cluster access

### Install Node Exporter

Before deploying Prometheus, ensure Node Exporter is running on all nodes:

```bash
cd ../../ansible
ansible-playbook playbooks/deploy_node_exporter.yaml
```

## Installation

The chart automatically creates the `monitoring` namespace using Helm pre-install hooks:

```bash
helm install prometheus .
```

This deploys:
- Prometheus server
- ConfigMap with scrape targets for all Raspberry Pi nodes
- PersistentVolume for metrics storage
- Service for accessing Prometheus UI

## Verify the Deployment

### Check Pod Status

Check the status of the Prometheus pods to ensure they are running:
```bash
kubectl get pods -n monitoring -l app=prometheus
```

Expected Output:
```bash
NAME                                     READY   STATUS    RESTARTS   AGE
prometheus-<unique-id>                   2/2     Running   0          2m
```

### Find the Prometheus Service

To find the service that you need to port forward, run the following command:
```bash
kubectl get svc -n monitoring
```

Look for the Prometheus service. The expected output should include something like:
```bash
NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
prometheus              ClusterIP   10.43.200.100    <none>        9090/TCP   2m
```

## Accessing Prometheus

Prometheus uses a ClusterIP service and is only accessible within the Kubernetes cluster. External access will be provided through Grafana in a future deployment.

### Internal Cluster Access

From within the cluster:
```
prometheus.monitoring.svc.cluster.local:9090
```

### Port Forward (For Development/Testing)

To access temporarily from your local machine:

```bash
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

Then navigate to `http://localhost:9090`

#### Run the `up` Query

To verify that Prometheus is scraping the metrics from all nodes, run the `up` query:
1. Click on the "Graph" tab.
2. In the query input box, type `up` and click "Execute".
3. You should see results for all your nodes. If everything is configured correctly, you should see entries for each of your Raspberry Pi nodes and the Prometheus server itself.

Expected Output:
```plaintext
up{instance="master:9100", job="raspberry-pi-nodes"} 1
up{instance="worker1:9100", job="raspberry-pi-nodes"} 1
up{instance="worker2:9100", job="raspberry-pi-nodes"} 1
up{instance="worker3:9100", job="raspberry-pi-nodes"} 1
up{instance="localhost:9090", job="prometheus"} 1
```

**Note**: If you previously had IP-based targets, those metrics will remain in Prometheus for the default 15-day retention period. The new hostname-based targets will start accumulating immediately alongside the old ones.
