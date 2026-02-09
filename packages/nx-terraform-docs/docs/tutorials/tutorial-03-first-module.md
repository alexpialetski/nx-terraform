---
sidebar_position: 3
---

# Tutorial 3: Multiple Environments with tfvars

Use one infrastructure project for dev and prod by adding variables, tfvars files, and Nx **target configurations** so you can run plan/apply per environment.

## What You'll Do

- Add variables and `tfvars/dev.tfvars`, `tfvars/prod.tfvars` to `terraform-infra`
- Add a **configurations** block to `project.json` so `--configuration=dev` and `--configuration=prod` pick the right var file
- Run plan and apply per environment

## Prerequisites

- [Tutorial 1](/docs/tutorials/tutorial-01-create-workspace) and [Tutorial 2](/docs/tutorials/tutorial-02-setup-backend) completed (workspace + one infra project, optionally with a module)

## Step 1: Add Variables

Edit `packages/terraform-infra/variables.tf` (add or merge):

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}
```

Use them in `packages/terraform-infra/main.tf`, for example:

```hcl
resource "local_file" "config" {
  content  = "env=${var.environment} count=${var.instance_count}\n"
  filename = "${path.module}/config-${var.environment}.txt"
}

output "environment" {
  value = var.environment
}
```

## Step 2: Add tfvars Files

Create the directory and files:

```bash
mkdir -p packages/terraform-infra/tfvars
```

**packages/terraform-infra/tfvars/dev.tfvars:**

```hcl
environment    = "dev"
instance_count = 1
```

**packages/terraform-infra/tfvars/prod.tfvars:**

```hcl
environment    = "prod"
instance_count = 3
```

## Step 3: Add Target Configurations in project.json

So that `terraform-plan` and `terraform-destroy` use the correct var file per environment, add **configurations** to the inferred targets. Edit `packages/terraform-infra/project.json` and add (or merge into) the `targets` section:

```json
"targets": {
  "terraform-init": {
    "metadata": { "backendProject": "terraform-setup" }
  },
"terraform-plan": {
      "options": {
        "args": ["-var-file=tfvars/dev.tfvars"]
      },
      "configurations": {
        "prod": {
          "args": ["-var-file=tfvars/prod.tfvars"]
        }
      }
    },
    "terraform-destroy": {
      "options": {
        "args": ["-var-file=tfvars/dev.tfvars"]
      },
      "configurations": {
        "prod": {
          "args": ["-var-file=tfvars/prod.tfvars"]
        }
      }
    }
}
```

The `args` array overrides the default command arguments. Paths in `-var-file` are relative to the project root (where the command runs). Nx merges these with the plugin-inferred targets. If your file already has `terraform-init` with `metadata.backendProject`, add only the `terraform-plan` and `terraform-destroy` blocks. The [Configuration guide](/docs/guides/configuration) has more on using `args` and configurations.

## Step 4: Run Per Environment

**Dev (default):**

```bash
nx run terraform-infra:terraform-plan
nx run terraform-infra:terraform-apply
```

**Prod:**

```bash
nx run terraform-infra:terraform-plan --configuration=prod
nx run terraform-infra:terraform-apply --configuration=prod
```

`terraform-apply` uses the plan from the same configuration, so run plan with the same `--configuration` before apply.

Verify:

```bash
cat packages/terraform-infra/config-dev.txt
cat packages/terraform-infra/config-prod.txt
```

## Summary

You used one project with tfvars and target configurations to run plan/apply for dev and prod. For more patterns, see the [Configuration guide](/docs/guides/configuration) and [Examples](/docs/examples/multiple-environments).
