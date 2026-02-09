---
sidebar_position: 1
---

# Complete Workflow Example

End-to-end path from zero to deployed infrastructure with a reusable module.

**Follow the tutorials** for the full step-by-step; this page is a quick reference.

| Goal | Where to go |
|------|-------------|
| Create workspace and run plan/apply | [Tutorial 1: Create a workspace and run](/docs/tutorials/tutorial-01-create-workspace) |
| Add a reusable module (e.g. networking) and use it | [Tutorial 2: Add a reusable module](/docs/tutorials/tutorial-02-setup-backend) |
| Use dev/prod with tfvars and `--configuration=...` | [Tutorial 3: Multiple environments with tfvars](/docs/tutorials/tutorial-03-first-module) |

## Command sequence (after tutorials)

```bash
# Create and enter workspace
npx create-nx-terraform-app my-infrastructure
cd my-infrastructure

# Apply backend, then run infra
nx run terraform-setup:terraform-apply
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan
nx run terraform-infra:terraform-apply

# Add module (Tutorial 2), then from infra:
# nx run terraform-infra:terraform-plan && nx run terraform-infra:terraform-apply

# With configurations (Tutorial 3):
# nx run terraform-infra:terraform-plan --configuration=prod
# nx run terraform-infra:terraform-apply --configuration=prod
```

## Resulting structure

- `terraform-setup` – backend (state)
- `terraform-infra` – stateful project (optionally uses a reusable module)
- `networking` (optional) – reusable module

`nx graph` shows dependencies. For details and options, see the [Configuration](/docs/guides/configuration) and [Dependencies](/docs/guides/dependencies) guides.
