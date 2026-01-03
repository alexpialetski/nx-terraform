---
sidebar_position: 1
---

# Complete Workflow Example

This example demonstrates a complete workflow from workspace creation to infrastructure deployment using nx-terraform.

## Scenario

You're setting up a new infrastructure project for a web application with:
- A backend for state management
- A web application infrastructure module
- A networking module for shared networking resources

## Step 1: Create Workspace

Create a new workspace with Terraform support:

```bash
npx create-nx-terraform-app my-infrastructure
cd my-infrastructure
```

This creates:
- `terraform-setup` - Backend project
- `terraform-infra` - Initial infrastructure module

## Step 2: Apply Backend

Apply the backend to create state storage:

```bash
nx run terraform-setup:terraform-apply
```

This creates the S3 bucket (or local state) for storing Terraform state.

## Step 3: Create Networking Module

Create a reusable networking module:

```bash
nx g nx-terraform:terraform-module networking
```

Edit `packages/networking/main.tf`:

```hcl
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "subnet_count" {
  description = "Number of subnets"
  type        = number
  default     = 2
}

output "vpc_id" {
  value = "vpc-${var.vpc_cidr}"
}

output "subnet_ids" {
  value = [for i in range(var.subnet_count) : "subnet-${i}"]
}
```

## Step 4: Create Web Application Infrastructure

Create a stateful infrastructure module:

```bash
nx g nx-terraform:terraform-module web-app \
  --backendProject=terraform-setup
```

Edit `packages/web-app/main.tf`:

```hcl
module "networking" {
  source = "../../networking"
  
  vpc_cidr     = "10.0.0.0/16"
  subnet_count = 3
}

resource "local_file" "app_config" {
  content = <<-EOT
    VPC ID: ${module.networking.vpc_id}
    Subnets: ${join(", ", module.networking.subnet_ids)}
  EOT
  filename = "${path.module}/app-config.txt"
}

output "vpc_id" {
  value = module.networking.vpc_id
}
```

## Step 5: Initialize and Deploy

Initialize the web application infrastructure:

```bash
nx run web-app:terraform-init
```

Plan the changes:

```bash
nx run web-app:terraform-plan
```

Apply the infrastructure:

```bash
nx run web-app:terraform-apply
```

## Step 6: View Outputs

View the infrastructure outputs:

```bash
nx run web-app:terraform-output
```

## Complete Command Sequence

```bash
# 1. Create workspace
npx create-nx-terraform-app my-infrastructure
cd my-infrastructure

# 2. Apply backend
nx run terraform-setup:terraform-apply

# 3. Create networking module
nx g nx-terraform:terraform-module networking

# 4. Create web app infrastructure
nx g nx-terraform:terraform-module web-app --backendProject=terraform-setup

# 5. Initialize and deploy
nx run web-app:terraform-init
nx run web-app:terraform-plan
nx run web-app:terraform-apply

# 6. View outputs
nx run web-app:terraform-output
```

## Project Structure

After completing the workflow:

```
my-infrastructure/
├── packages/
│   ├── terraform-setup/      # Backend project
│   │   ├── project.json
│   │   ├── main.tf
│   │   └── backend.config    # Generated after apply
│   ├── networking/            # Reusable module
│   │   ├── project.json
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── web-app/              # Stateful infrastructure
│       ├── project.json      # References terraform-setup backend
│       ├── main.tf           # References networking module
│       ├── backend.tf
│       └── outputs.tf
```

## Dependency Graph

View the dependency graph:

```bash
nx graph
```

You'll see:
- `web-app` → `terraform-setup` (backend dependency)
- `web-app` → `networking` (module dependency)

## Next Steps

- Add more infrastructure modules
- Create environment-specific configurations
- Set up CI/CD pipelines
- Add more reusable modules

