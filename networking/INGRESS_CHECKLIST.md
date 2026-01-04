# Ingress Setup Checklist

This document provides a step-by-step checklist for configuring external HTTPS access to the Salt application running on the Raspberry Pi Kubernetes cluster. The architecture uses Cloudflare for DNS and DDoS protection, Traefik Ingress Controller (K3s default) for traffic routing, and cert-manager for automated TLS certificate management.

---

## Prerequisites

Before proceeding, ensure the following are in place:

- K3s cluster is running and accessible via kubectl
- Helm is installed on the control machine
- Domain surflocal.app is registered and accessible via Cloudflare dashboard
- Router has port forwarding configured for ports 80 and 443 to the master node (192.168.1.67)

---


## Phase 5: Configure Ingress Resources

### AI ACTION: Create Ingress for Salt Application

Update the salt-app Helm values to enable ingress with TLS:

```yaml
# In helm/salt-app/values.yaml
ingress:
  enabled: true
  className: traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.tls: "true"
  hosts:
    - host: surflocal.app
      paths:
        - path: /
          pathType: Prefix
    - host: www.surflocal.app
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: surflocal-app-tls
      hosts:
        - surflocal.app
        - www.surflocal.app
```

### AI ACTION: Create Ingress for Salt API

The API should be accessible at api.surflocal.app or at surflocal.app/api. Update the salt-api Helm values accordingly:

```yaml
# In helm/salt-api/values.yaml
ingress:
  enabled: true
  className: traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.tls: "true"
  hosts:
    - host: surflocal.app
      paths:
        - path: /api
          pathType: Prefix
  tls:
    - secretName: surflocal-api-tls
      hosts:
        - surflocal.app
```

---

## Phase 6: Deploy and Verify

### AI ACTION: Apply Configurations

```bash
# Install or upgrade ClusterIssuers (if not done in Phase 3)
helm upgrade --install cert-manager ./helm/cert-manager -n cert-manager

# Upgrade Helm releases with ingress enabled
helm upgrade salt-app ./helm/salt-app -n salt
helm upgrade salt-api ./helm/salt-api -n salt
```

### Verification

Check that certificates are issued:

```bash
kubectl get certificates -n salt
kubectl describe certificate surflocal-app-tls -n salt
```

Check ingress resources:

```bash
kubectl get ingress -n salt
```

### USER ACTION REQUIRED: Test HTTPS Access

Once certificates are issued, verify HTTPS access:

```bash
curl -v https://surflocal.app
curl -v https://surflocal.app/api/health
```

---

## Phase 7: Optional Cloudflare Proxy Enablement

After verifying that Let's Encrypt certificates are working, you may optionally enable Cloudflare proxying for additional security benefits.

### USER ACTION REQUIRED: Enable Cloudflare Proxy (Optional)

In the Cloudflare dashboard, change the proxy status for your A records from "DNS only" (grey cloud) to "Proxied" (orange cloud). This provides:

- DDoS protection
- CDN caching for static assets
- Web Application Firewall
- Analytics and insights

Note that enabling Cloudflare proxy changes the SSL mode. Configure Cloudflare SSL/TLS settings to "Full (strict)" to maintain end-to-end encryption with your Let's Encrypt certificates.

---

## Troubleshooting

### Certificate Not Issuing

Check cert-manager logs:

```bash
kubectl logs -n cert-manager -l app=cert-manager
```

Check certificate request status:

```bash
kubectl describe certificaterequest -n salt
kubectl describe challenge -n salt
```

### Ingress Not Routing Traffic

Verify Traefik is receiving traffic:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=traefik
```

Check ingress resource configuration:

```bash
kubectl describe ingress -n salt
```

### Port Forwarding Issues

Ensure router NAT rules are correctly configured and that no firewall on the master node is blocking ports 80 and 443:

```bash
sudo iptables -L -n | grep -E "80|443"
```

---

## Summary of User Actions

1. Configure router port forwarding for ports 80 and 443 to 192.168.1.67
2. Verify ports are accessible from the internet
3. Provide email address for Let's Encrypt notifications
4. Configure Cloudflare DNS A records pointing to your public IP
5. Test HTTPS access after deployment
6. Optionally enable Cloudflare proxy for additional security
