- better logging

# Kubernetes

- Security: 
  - [x] Implement Basic NetworkPolicies (API -> DB/Redis/DNS)
  - [x] SecurityContext (runAsNonRoot, readOnlyRootFilesystem)
  - [ ] Full Namespace isolation (Deny-all default)
  - [ ] Dedicated ServiceAccounts (avoid 'default' SA)
- [x] Scalability: Add HorizontalPodAutoscaler (HPA) and PodDisruptionBudget (PDB)
- [x] High Availability: Increase API replicas and add Anti-Affinity
- [x] Observability: Add ServiceMonitors for Prometheus/Grafana
- [x] Config Cleanup: Update hosts, set GOOGLE_CALLBACK_URL
