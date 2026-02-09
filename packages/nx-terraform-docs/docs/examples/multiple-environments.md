---
sidebar_position: 2
---

# Multiple Environments Example

Two ways to handle dev/staging/prod:

## One project, multiple envs (tfvars + configurations)

Use **one** infrastructure project and switch envs with `--configuration=dev` or `--configuration=prod`. You add tfvars and a **configurations** block in `project.json` so each configuration uses the right var file.

**→ [Tutorial 3: Multiple environments with tfvars](/docs/tutorials/tutorial-03-first-module)**

That tutorial shows:

- Adding `tfvars/dev.tfvars` and `tfvars/prod.tfvars`
- Adding `terraform-plan` (and `terraform-destroy`) `options.args` with `-var-file` and `configurations.dev` / `configurations.prod` in `project.json`
- Running `nx run terraform-infra:terraform-plan --configuration=prod` and apply

## Separate project per environment

Use **one Nx project per environment** (e.g. `dev-infra`, `prod-infra`) with separate state and `nx run dev-infra:...` / `nx run prod-infra:...`.

Quick version:

```bash
nx g nx-terraform:terraform-module dev-infra --backendProject=terraform-setup
nx g nx-terraform:terraform-module prod-infra --backendProject=terraform-setup
# Add variables/tfvars in each, then:
nx run dev-infra:terraform-apply
nx run prod-infra:terraform-apply
```

For patterns and using `args` with `-var-file`, see the [Configuration guide](/docs/guides/configuration).
