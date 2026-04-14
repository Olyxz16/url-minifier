# Kubernetes Deployment with Flux CD

This project uses [Flux CD](https://fluxcd.io/) for GitOps-based deployments. The configuration is structured to support multiple environments (Staging and Production) using Kustomize overlays.

## Structure

- `k8s/base/`: Common Kubernetes manifests.
- `k8s/overlays/`: Environment-specific patches and configurations.
  - `staging/`: Overrides for the staging environment (e.g., Rate Limit: 100,000 RPM).
  - `production/`: Overrides for the production environment (e.g., Rate Limit: 100 RPM).
- `k8s/cluster/`: Flux bootstrap and sync definitions.
  - `flux-system/`: Core Flux components (Bootstrap).
  - `staging/`: Sync definitions for Staging (points to the `staging` branch).
  - `production/`: Sync definitions for Production (points to the `main` branch).

## Best Practices

Application syncs (`GitRepository` and `Kustomization` objects) should be kept outside the `flux-system` directory. This allows for:
1. **Environment Isolation**: Each cluster can be bootstrapped to point to its own environment directory.
2. **Branch Targeting**: Staging can track a `staging` branch while Production tracks `main`.
3. **Clean Bootstrap**: `flux-system` remains focused on the Flux components themselves.

## Deployment Commands

### 1. Install Flux CLI
Follow the [official instructions](https://fluxcd.io/flux/installation/) to install the Flux CLI.

### 2. Bootstrap Staging Environment
To bootstrap a cluster for the staging environment (tracking the `staging` branch):

```bash
flux bootstrap github \
  --owner=Olyxz16 \
  --repository=url-minifier \
  --branch=staging \
  --path=k8s/cluster/staging \
  --personal
```

### 3. Bootstrap Production Environment
To bootstrap a cluster for the production environment (tracking the `main` branch):

```bash
flux bootstrap github \
  --owner=Olyxz16 \
  --repository=url-minifier \
  --branch=main \
  --path=k8s/cluster/production \
  --personal
```

## Manual Sync
If you make changes and want to trigger an immediate sync:

```bash
flux reconcile kustomization url-minifier-api-sync --with-source
```
