---
sidebar_position: 3
---

# Reusable Modules Example

Reusable Terraform modules (no backend) are used by stateful projects; Nx infers dependencies from `module { source = "..." }` and from `terraform-init.metadata.backendProject`.

**→ [Tutorial 2: Add a reusable module](/docs/tutorials/tutorial-02-setup-backend)** – create one module and use it from `terraform-infra`.

## Minimal pattern

```bash
# Create reusable module (no --backendProject)
nx g nx-terraform:terraform-module networking

# Use it from your stateful project (e.g. terraform-infra)
# In packages/terraform-infra/main.tf:
#   module "networking" { source = "../../networking"; vpc_cidr = "10.0.0.0/16"; ... }
nx run terraform-infra:terraform-plan
nx graph   # shows terraform-infra → networking
```

Dependencies are created automatically. See the [Dependencies guide](/docs/guides/dependencies) for how backend and module references are detected.
