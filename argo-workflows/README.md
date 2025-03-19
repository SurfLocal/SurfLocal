# Argo Workflows Helm Deployment

## Installing CRDs

The CRDs were downloaded from the minimal CRDs available in the official Argo Workflows repository: [Argo Workflows CRDs](https://github.com/argoproj/argo-workflows/tree/main/manifests/base/crds) and stored locally in the `./crds` directory.

### Using kustomization.yaml

Install Kustomize: If you don't have Kustomize installed, you can install it via the following command:

```sh
brew install kustomize
```

Apply the Resources Using Kustomize: After navigating to the folder containing the `kustomization.yaml` file, use the following command to apply the resources:

```sh
kubectl apply -k ./crds/
```

This will automatically apply all the CRDs listed in the `kustomization.yaml` file.

Verify the CRDs are installed:

```sh
kubectl get crds | grep argo
```

You should see entries like `cronworkflows.argoproj.io`, `workflows.argoproj.io`, and others.

## Deploying Argo Workflows with Helm

Create the Argo namespace:

```sh
kubectl create namespace argo
```

Deploy all resources using Helm:

```sh
helm install argo-workflows ./argo-workflows -n argo
```

Note that instaling this chart will also install the subchart for MinIO which will be used for log storage.

### Argo UI Status
The Argo Server UI has **not** been deployed due to a metadata issue that arose after initializing the PostgreSQL database. The Argo controller attempted to query a column that did not exist in the workflows tables, which led to various UI features failing and rendering the UI essentially useless. This issue also prevented persistence from being enabled, as tracking previous workflow runs was not possible. Since the UI is a low-priority item, it has been omitted from this deployment. Artifact storage is already configured via `boto3`, which uploads logs to MinIO.

### Future Logging Strategy

Workflow execution logs are currently being ingested in JSON format. In a future update, log tracking and analysis will be handled via OpenSearch, providing a more structured and efficient method for monitoring workflow execution.
