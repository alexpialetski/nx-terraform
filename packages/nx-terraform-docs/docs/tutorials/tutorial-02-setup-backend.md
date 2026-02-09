---
sidebar_position: 2
---

# Tutorial 2: Add a Reusable Module

Add a reusable Terraform module (e.g. networking) and use it from your infrastructure project. Nx will detect the dependency and order runs correctly.

## What You'll Do

- Create a reusable module with the generator (no backend = library-style module)
- Reference it from `terraform-infra`
- Run plan/apply and see the dependency in the graph

## Prerequisites

- [Tutorial 1: Create a workspace and run](/docs/tutorials/tutorial-01-create-workspace) completed

## Step 1: Create the Module

From the workspace root:

```bash
nx g nx-terraform:terraform-module networking
```

This creates `packages/networking/` with no backend (reusable code only). See [Project Types](/docs/guides/project-types#module-projects) for module vs stateful.

## Step 2: Add Inputs and Outputs

Edit `packages/networking/variables.tf`:

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "subnet_count" {
  description = "Number of subnets"
  type        = number
  default     = 2
}
```

Edit `packages/networking/outputs.tf`:

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = "vpc-${replace(var.vpc_cidr, ".", "-")}"
}

output "subnet_ids" {
  description = "Subnet IDs"
  value       = [for i in range(var.subnet_count) : "subnet-${i}"]
}
```

Edit `packages/networking/main.tf` to expose them (or leave minimal); the outputs above are enough for this tutorial.

## Step 3: Use the Module in Infrastructure

Edit `packages/terraform-infra/main.tf` and add a module block (adjust or replace existing content):

```hcl
module "networking" {
  source = "../../networking"

  vpc_cidr     = "10.0.0.0/16"
  subnet_count = 3
}

resource "local_file" "example" {
  content  = "VPC: ${module.networking.vpc_id}"
  filename = "${path.module}/output.txt"
}

output "vpc_id" {
  value = module.networking.vpc_id
}
```

Ensure the `local` provider is in `packages/terraform-infra/provider.tf` if you use `local_file` (see [Tutorial 1](/docs/tutorials/tutorial-01-create-workspace)).

## Step 4: Run and Verify

```bash
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan
nx run terraform-infra:terraform-apply
```

Open the graph:

```bash
nx graph
```

You should see `terraform-infra` → `networking`. Dependencies are inferred from the module `source` and from `terraform-init.metadata.backendProject`. See [Dependencies](/docs/guides/dependencies) for details.

## Summary

You added a reusable module and consumed it from your infrastructure project. Next: [Tutorial 3: Multiple environments with tfvars](/docs/tutorials/tutorial-03-first-module) (one project, dev/prod via configurations).
