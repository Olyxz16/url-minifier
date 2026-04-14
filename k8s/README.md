# Kubernetes Deployment with Flux CD

This project uses [Flux CD](https://fluxcd.io/) for GitOps-based deployments. The configuration is structured to support multiple environments (Staging and Production) using Kustomize overlays.

## Structure

- `k8s/base/`: Common Kubernetes manifests.
- `k8s/overlays/`: Environment-specific patches and configurations.
  - `staging/`: Overrides for the staging environment (e.g., Rate Limit: 100,000 RPM).
  - `production/`: Overrides for the production environment (e.g., Rate Limit: 100 RPM).
- `k8s/cluster/`: Flux bootstrap and sync definitions.
  - `staging/`: Self-contained Flux config for Staging (tracks the `staging` branch).
  - `production/`: Self-contained Flux config for Production (tracks the `main` branch).

## How to migrate an existing cluster

If your cluster was previously bootstrapped to `./k8s/cluster` or `./k8s/cluster/flux-system`, Flux will block a simple re-bootstrap to the new path to prevent configuration loss. Follow these steps to migrate:

### 1. Push these changes to GitHub
Commit and push the new directory structure to both your `main` and `staging` branches.

### 2. Update the cluster manually
Apply the new root Kustomization to your cluster to update the sync path:

```bash
# For Staging
kubectl patch kustomization flux-system -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/path", "value":"./k8s/cluster/staging"}]'

# For Production
kubectl patch kustomization flux-system -n flux-system --type='json' -p='[{"op": "replace", "path": "/spec/path", "value":"./k8s/cluster/production"}]'
```

### 3. Re-bootstrap
Now that the path matches, you can run the bootstrap command to ensure all metadata is synchronized:

```bash
# For Staging (tracks staging branch)
flux bootstrap github \
  --owner=Olyxz16 \
  --repository=url-minifier \
  --branch=staging \
  --path=k8s/cluster/staging \
  --personal

# For Production (tracks main branch)
flux bootstrap github \
  --owner=Olyxz16 \
  --repository=url-minifier \
  --branch=main \
  --path=k8s/cluster/production \
  --personal
```

## Manual Sync
To trigger an immediate sync after a change:

```bash
flux reconcile kustomization flux-system --with-source
```
