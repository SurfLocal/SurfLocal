---
name: Infrastructure Issue
about: Report problems with cluster setup, networking, or deployment
title: "[INFRA] "
labels: ["infrastructure", "triage"]
assignees: ""

---

## Infrastructure Issue Description
A clear description of the infrastructure problem you're experiencing.

## Component Affected
Which infrastructure component is affected?
- [ ] Raspberry Pi hardware
- [ ] Networking setup
- [ ] Kubernetes/k3s cluster
- [ ] Docker containers
- [ ] Ansible playbooks
- [ ] Helm charts
- [ ] PostgreSQL database
- [ ] MinIO storage
- [ ] Prometheus monitoring
- [ ] Other (please specify)

## Configuration Details
Please provide relevant configuration details:

**Ansible Inventory:**
```yaml
# Paste relevant hosts file content here
```

**Playbook Used:**
```bash
# Paste the command you ran
ansible-playbook playbooks/...
```

**Helm Chart:**
```bash
# Paste the helm command you used
helm upgrade --install ...
```

## Reproduction Steps
Steps to reproduce the issue:

1. 
2. 
3. 

## Error Messages
Please paste the full error message you're seeing:

```
# Paste error here
```

## System Information
**Node Information:**
- Node name: [e.g., master, worker1, postgres]
- OS: [e.g., Raspberry Pi OS 64-bit]
- Architecture: [e.g., ARM64]
- Memory: [e.g., 8GB]
- Storage: [e.g., 256GB SSD]

**Network Configuration:**
- IP Address: [e.g., 192.168.1.100]
- Router: [e.g., AT&T BGW320]
- DNS: [e.g., No-IP DDNS configured]

**Cluster Status:**
```bash
# Paste kubectl get nodes output
kubectl get nodes -o wide
```

**Service Status:**
```bash
# Paste relevant service status
kubectl get pods -n <namespace>
kubectl get svc -n <namespace>
```

## Debug Logs
Please provide relevant logs:

**Ansible Logs:**
```bash
# Paste ansible output
```

**System Logs:**
```bash
# Paste journalctl or systemctl logs
sudo journalctl -u <service-name> -n 50
```

**Kubernetes Logs:**
```bash
# Paste kubectl logs
kubectl logs -n <namespace> <pod-name>
```

## Impact
- [ ] Critical - Cluster is down or unusable
- [ ] High - Major functionality is broken
- [ ] Medium - Partial functionality affected
- [ ] Low - Minor issue or inconvenience

## Troubleshooting Steps Taken
What have you already tried to fix this issue?

1. 
2. 
3. 

## Additional Context
Add any other context about the infrastructure problem here.

## Checklist
- [ ] I have checked system logs for errors
- [ ] I have verified network connectivity
- [ ] I have checked resource usage (CPU, memory, disk)
- [ ] I have included relevant configuration files
- [ ] I have provided complete error messages
