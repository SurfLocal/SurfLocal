# Helm Chart Standards

This document defines the standardized structure and conventions for all Helm charts in this repository.

## Table of Contents

- [Directory Structure](#directory-structure)
- [values.yaml Convention](#valuesyaml-convention)
- [Template Standards](#template-standards)
- [Naming Conventions](#naming-conventions)
- [Documentation Requirements](#documentation-requirements)
- [Examples](#examples)

## Directory Structure

```
helm/
├── STANDARDS.md                    # This file
├── README.md                       # Overview of all charts
└── <chart-name>/
    ├── Chart.yaml                  # Chart metadata
    ├── values.yaml                 # Default configuration values
    ├── values.schema.json          # (Optional) JSON schema for validation
    ├── README.md                   # Chart-specific documentation
    ├── templates/
    │   ├── _helpers.tpl            # Template helpers and functions
    │   ├── NOTES.txt               # Post-install notes
    │   ├── namespace.yaml          # Namespace definition (if needed)
    │   ├── configmap.yaml          # ConfigMaps
    │   ├── secret.yaml             # Secrets
    │   ├── deployment.yaml         # Deployments
    │   ├── service.yaml            # Services
    │   ├── ingress.yaml            # Ingress rules (if applicable)
    │   ├── pv.yaml                 # PersistentVolumes
    │   ├── pvc.yaml                # PersistentVolumeClaims
    │   ├── rbac.yaml               # RBAC resources
    │   └── hooks/                  # Helm hooks
    │       ├── pre-install.yaml
    │       ├── post-install.yaml
    │       └── post-upgrade.yaml
    └── charts/                     # Subcharts (if any)
        └── <subchart-name>/
```

## values.yaml Convention

All `values.yaml` files must follow this hierarchical structure:

```yaml
# ==============================================================================
# GLOBAL CONFIGURATION
# ==============================================================================
# Global settings that apply across all components
global:
  # Environment: dev, staging, prod
  environment: prod
  
  # Cluster-wide settings
  clusterDomain: cluster.local
  
  # Image pull secrets (if needed)
  imagePullSecrets: []

# ==============================================================================
# METADATA
# ==============================================================================
# Kubernetes metadata configuration
metadata:
  # Namespace where resources will be deployed
  namespace: default
  
  # Common labels applied to all resources
  labels:
    app.kubernetes.io/name: ""
    app.kubernetes.io/instance: ""
    app.kubernetes.io/version: ""
    app.kubernetes.io/component: ""
    app.kubernetes.io/part-of: ""
    app.kubernetes.io/managed-by: Helm
  
  # Common annotations
  annotations: {}

# ==============================================================================
# IMAGE CONFIGURATION
# ==============================================================================
# Container image settings
image:
  # Image repository
  repository: ""
  
  # Image tag (defaults to Chart.appVersion if not set)
  tag: ""
  
  # Image pull policy
  pullPolicy: IfNotPresent
  
  # Image pull secrets
  pullSecrets: []

# ==============================================================================
# DEPLOYMENT CONFIGURATION
# ==============================================================================
# Deployment/StatefulSet settings
deployment:
  # Number of replicas
  replicaCount: 1
  
  # Update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  # Pod disruption budget
  podDisruptionBudget:
    enabled: false
    minAvailable: 1
  
  # Restart policy
  restartPolicy: Always

# ==============================================================================
# RESOURCE MANAGEMENT
# ==============================================================================
# CPU and memory resource limits/requests
resources:
  limits:
    cpu: ""
    memory: ""
  requests:
    cpu: ""
    memory: ""

# ==============================================================================
# NETWORKING
# ==============================================================================
# Service and networking configuration
service:
  # Service type: ClusterIP, NodePort, LoadBalancer
  type: ClusterIP
  
  # Service ports
  ports: []
    # - name: http
    #   port: 80
    #   targetPort: 8080
    #   protocol: TCP
    #   nodePort: 30080  # Only for NodePort type
  
  # Service annotations
  annotations: {}
  
  # Session affinity
  sessionAffinity: None

# Ingress configuration
ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts: []
  tls: []

# ==============================================================================
# STORAGE
# ==============================================================================
# Persistent storage configuration
persistence:
  enabled: false
  
  # Storage class
  storageClass: ""
  
  # Access modes
  accessModes:
    - ReadWriteOnce
  
  # Storage size
  size: 10Gi
  
  # Use existing PVC
  existingClaim: ""
  
  # PV configuration (for static provisioning)
  persistentVolume:
    enabled: false
    hostPath: ""
    nodeAffinity: {}

# ==============================================================================
# SECURITY
# ==============================================================================
# Security context and RBAC
securityContext:
  # Pod security context
  pod:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  
  # Container security context
  container:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    runAsNonRoot: true
    runAsUser: 1000
    capabilities:
      drop:
        - ALL

# RBAC configuration
rbac:
  enabled: true
  serviceAccount:
    create: true
    name: ""
    annotations: {}

# ==============================================================================
# CONFIGURATION
# ==============================================================================
# Application-specific configuration
config:
  # Environment variables
  env: []
    # - name: KEY
    #   value: "value"
  
  # ConfigMap data
  data: {}
  
  # Secret data (base64 encoded)
  secrets: {}

# ==============================================================================
# HEALTH CHECKS
# ==============================================================================
# Liveness and readiness probes
healthChecks:
  liveness:
    enabled: true
    httpGet:
      path: /healthz
      port: http
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    successThreshold: 1
    failureThreshold: 3
  
  readiness:
    enabled: true
    httpGet:
      path: /ready
      port: http
    initialDelaySeconds: 5
    periodSeconds: 5
    timeoutSeconds: 3
    successThreshold: 1
    failureThreshold: 3

# ==============================================================================
# SCHEDULING
# ==============================================================================
# Pod scheduling configuration
scheduling:
  # Node selector
  nodeSelector: {}
  
  # Tolerations
  tolerations: []
  
  # Affinity rules
  affinity: {}
  
  # Priority class
  priorityClassName: ""

# ==============================================================================
# MONITORING
# ==============================================================================
# Monitoring and observability
monitoring:
  # Prometheus metrics
  metrics:
    enabled: false
    port: 9090
    path: /metrics
    serviceMonitor:
      enabled: false
      interval: 30s
  
  # Logging
  logging:
    level: info
    format: json

# ==============================================================================
# AUTOSCALING
# ==============================================================================
# Horizontal Pod Autoscaler
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80

# ==============================================================================
# APPLICATION-SPECIFIC CONFIGURATION
# ==============================================================================
# Custom configuration specific to this application
# This section varies per chart and should be well-documented
```

## Template Standards

### 1. Use Template Helpers

Define reusable template helpers in `_helpers.tpl`:

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "mychart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "mychart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mychart.labels" -}}
helm.sh/chart: {{ include "mychart.chart" . }}
{{ include "mychart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.metadata.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mychart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mychart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### 2. Template Structure

Each template file should follow this structure:

```yaml
{{- if .Values.component.enabled }}
---
apiVersion: v1
kind: ResourceType
metadata:
  name: {{ include "mychart.fullname" . }}-component
  namespace: {{ .Values.metadata.namespace }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
    component: component-name
  {{- with .Values.metadata.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  # Spec configuration using values
  {{- with .Values.component.config }}
  config:
    {{- toYaml . | nindent 4 }}
  {{- end }}
{{- end }}
```

### 3. Conditional Rendering

Use conditional blocks for optional features:

```yaml
{{- if .Values.feature.enabled }}
# Feature configuration
{{- end }}
```

### 4. Default Values

Always provide sensible defaults using the `default` function:

```yaml
replicas: {{ .Values.deployment.replicaCount | default 1 }}
```

## Naming Conventions

### Resource Names

- **Chart name**: lowercase, hyphen-separated (e.g., `argo-workflows`)
- **Resource names**: `{{ .Release.Name }}-{{ .Chart.Name }}-<component>`
- **Labels**: Use standard Kubernetes labels
- **ConfigMaps/Secrets**: `<chart-name>-<purpose>` (e.g., `prometheus-config`)

### Values Keys

- **Top-level keys**: camelCase (e.g., `replicaCount`, `nodeSelector`)
- **Nested keys**: camelCase
- **Boolean flags**: Use `enabled` suffix (e.g., `metrics.enabled`)

## Documentation Requirements

### Chart.yaml

Must include:
```yaml
apiVersion: v2
name: chart-name
description: A clear, concise description
version: 0.1.0  # Chart version (SemVer)
appVersion: "1.0.0"  # Application version
keywords:
  - keyword1
  - keyword2
maintainers:
  - name: Maintainer Name
    email: email@example.com
```

### README.md

Each chart must have a README with:

1. **Overview**: What the chart deploys
2. **Prerequisites**: Required dependencies
3. **Installation**: How to install
4. **Configuration**: Table of all values
5. **Upgrading**: Upgrade instructions
6. **Uninstalling**: How to remove

### NOTES.txt

Provide post-installation instructions:

```
Thank you for installing {{ .Chart.Name }}.

Your release is named {{ .Release.Name }}.

To learn more about the release, try:

  $ helm status {{ .Release.Name }}
  $ helm get all {{ .Release.Name }}

To access the application:
  {{ if .Values.ingress.enabled }}
  http://{{ index .Values.ingress.hosts 0 }}
  {{- else }}
  kubectl port-forward svc/{{ include "mychart.fullname" . }} 8080:80
  {{- end }}
```

## Examples

See the following charts for reference implementations:
- `prometheus/` - Monitoring infrastructure
- `argo-workflows/` - Workflow orchestration
- `argo-workflows/charts/minio/` - Object storage subchart

## Best Practices

1. **Parameterize everything**: No hardcoded values in templates
2. **Use helpers**: Reduce duplication with template functions
3. **Validate inputs**: Use `required` for mandatory values
4. **Document thoroughly**: Every value should be documented
5. **Test extensively**: Test with different value combinations
6. **Version properly**: Follow SemVer for chart versions
7. **Security first**: Enable security contexts by default
8. **Resource limits**: Always define resource requests/limits
9. **Health checks**: Include liveness and readiness probes
10. **Idempotency**: Charts should be safely upgradeable

## Migration Guide

When updating existing charts to follow these standards:

1. Create new `values.yaml` following the standard structure
2. Update templates to reference new value paths
3. Add `_helpers.tpl` with standard helper functions
4. Update `Chart.yaml` with complete metadata
5. Write comprehensive README.md
6. Add NOTES.txt for post-install guidance
7. Test deployment with new values
8. Update documentation

## Validation

Before committing changes:

```bash
# Lint the chart
helm lint ./helm/<chart-name>

# Dry-run installation
helm install --dry-run --debug <release-name> ./helm/<chart-name>

# Template rendering
helm template <release-name> ./helm/<chart-name>
```
