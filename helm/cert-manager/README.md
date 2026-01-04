# cert-manager Configuration

This chart manages the ClusterIssuer resources for automated TLS certificate provisioning using Let's Encrypt. It is designed to work alongside the official cert-manager installation.

## Overview

cert-manager is a Kubernetes add-on that automates the management and issuance of TLS certificates. This chart creates ClusterIssuer resources that configure cert-manager to obtain certificates from Let's Encrypt using the ACME protocol with HTTP-01 challenges via Traefik.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- cert-manager installed in the cluster (see Installation section)
- Traefik ingress controller (K3s default)

## Installation

cert-manager must be installed before applying this chart's ClusterIssuers.

### Step 1: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

Verify cert-manager is running:

```bash
kubectl get pods -n cert-manager
```

### Step 2: Apply ClusterIssuers

```bash
helm install cert-manager ./helm/cert-manager -n cert-manager
```

Or upgrade if already installed:

```bash
helm upgrade cert-manager ./helm/cert-manager -n cert-manager
```

## Configuration

The following table lists the configurable parameters and their default values.

### Cluster Issuer Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `clusterIssuers.email` | Email for Let's Encrypt notifications | `surflocal.ai@gmail.com` |
| `clusterIssuers.production.enabled` | Enable production issuer | `true` |
| `clusterIssuers.production.name` | Production issuer name | `letsencrypt-prod` |
| `clusterIssuers.qa.enabled` | Enable QA/staging issuer | `true` |
| `clusterIssuers.qa.name` | QA issuer name | `letsencrypt-qa` |
| `ingressClass` | Ingress class for HTTP-01 challenges | `traefik` |

### Resource Limits (for reference when installing cert-manager)

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.controller.limits.cpu` | Controller CPU limit | `200m` |
| `resources.controller.limits.memory` | Controller memory limit | `256Mi` |
| `resources.webhook.limits.cpu` | Webhook CPU limit | `100m` |
| `resources.webhook.limits.memory` | Webhook memory limit | `128Mi` |

## Usage

Once cert-manager and the ClusterIssuers are installed, you can request certificates by adding annotations to your Ingress resources.

### Production Certificates

For production use (rate limited by Let's Encrypt):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

### QA/Testing Certificates

For testing (not rate limited, but certificates are not trusted by browsers):

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-qa
```

## Verification

Check that ClusterIssuers are ready:

```bash
kubectl get clusterissuers
```

Expected output:

```
NAME              READY   AGE
letsencrypt-prod  True    1m
letsencrypt-qa    True    1m
```

Check certificate status:

```bash
kubectl get certificates -A
kubectl describe certificate <name> -n <namespace>
```

## Troubleshooting

### ClusterIssuer Not Ready

Check cert-manager logs:

```bash
kubectl logs -n cert-manager -l app=cert-manager
```

### Certificate Not Issuing

Check the certificate request and challenge:

```bash
kubectl describe certificaterequest -n <namespace>
kubectl describe challenge -n <namespace>
```

Common issues:
- DNS not pointing to the cluster
- Ingress class mismatch
- Port 80 not accessible from internet (required for HTTP-01)

### Rate Limiting

Let's Encrypt has rate limits for production certificates. Use the QA issuer for testing to avoid hitting limits. See [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/).

## Uninstalling

```bash
helm uninstall cert-manager -n cert-manager
```

To fully remove cert-manager:

```bash
helm uninstall cert-manager -n cert-manager
kubectl delete namespace cert-manager
```
