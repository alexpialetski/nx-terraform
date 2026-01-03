---
sidebar_position: 4
---

# Tutorial 4: Working with Multiple Environments

In this tutorial, you'll learn how to manage multiple environments (dev, staging, prod) using separate Terraform modules and configuration files. This is a common pattern for infrastructure management.

## What You'll Learn

- How to create environment-specific modules
- How to use tfvars files for environment configuration
- How to manage multiple environments in a monorepo
- Best practices for environment separation

## Prerequisites

- Completed [Tutorial 3: Create Your First Infrastructure Module](/docs/tutorials/tutorial-03-first-module)
- Understanding of Terraform variables and tfvars files

## Understanding Multi-Environment Patterns

There are two main approaches to managing multiple environments:

### Approach 1: Separate Modules (Recommended)

Each environment has its own Terraform module:
- `dev-infra` - Development environment
- `staging-infra` - Staging environment
- `prod-infra` - Production environment

**Advantages:**
- Complete isolation between environments
- Different state files per environment
- Easy to manage permissions separately
- Clear separation in the Nx graph

### Approach 2: Single Module with Configurations

One module with different tfvars files:
- `terraform-infra` with `tfvars/dev.tfvars` and `tfvars/prod.tfvars`

**Advantages:**
- Less code duplication
- Single source of truth for infrastructure structure
- Easier to keep environments in sync

For this tutorial, we'll use **Approach 1** (separate modules) as it's more robust for production use.

## Step 1: Create Development Environment Module

Create a module for the development environment:

```bash
nx g nx-terraform:terraform-module dev-infra --backendProject=terraform-setup
```

This creates:
- `packages/dev-infra/` directory
- Connected to `terraform-setup` backend
- Separate state file for dev environment

## Step 2: Create Production Environment Module

Create a module for the production environment:

```bash
nx g nx-terraform:terraform-module prod-infra --backendProject=terraform-setup
```

This creates:
- `packages/prod-infra/` directory
- Connected to `terraform-setup` backend
- Separate state file for prod environment

## Step 3: Configure Environment-Specific Variables

### Development Configuration

Edit `packages/dev-infra/variables.tf`:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 1
}

variable "instance_type" {
  description = "Instance type"
  type        = string
  default     = "t3.micro"
}
```

Create `packages/dev-infra/tfvars/dev.tfvars`:

```hcl
environment    = "dev"
instance_count = 1
instance_type  = "t3.micro"
```

### Production Configuration

Edit `packages/prod-infra/variables.tf`:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 3
}

variable "instance_type" {
  description = "Instance type"
  type        = string
  default     = "t3.medium"
}
```

Create `packages/prod-infra/tfvars/prod.tfvars`:

```hcl
environment    = "prod"
instance_count = 3
instance_type  = "t3.medium"
```

## Step 4: Use Variables in Your Infrastructure

Edit `packages/dev-infra/main.tf`:

```hcl
resource "local_file" "config" {
  content = <<-EOT
    Environment: ${var.environment}
    Instance Count: ${var.instance_count}
    Instance Type: ${var.instance_type}
  EOT
  filename = "${path.module}/config-${var.environment}.txt"
}

output "environment" {
  value = var.environment
}

output "instance_count" {
  value = var.instance_count
}
```

Do the same for `packages/prod-infra/main.tf`.

## Step 5: Deploy to Development

Initialize and deploy the development environment:

```bash
# Initialize
nx run dev-infra:terraform-init

# Plan with dev configuration
nx run dev-infra:terraform-plan --configuration=dev

# Apply
nx run dev-infra:terraform-apply --configuration=dev
```

### Verify Deployment

```bash
# View outputs
nx run dev-infra:terraform-output

# Check created file
cat packages/dev-infra/config-dev.txt
```

## Step 6: Deploy to Production

Initialize and deploy the production environment:

```bash
# Initialize
nx run prod-infra:terraform-init

# Plan with prod configuration
nx run prod-infra:terraform-plan --configuration=prod

# Apply
nx run prod-infra:terraform-apply --configuration=prod
```

### Verify Deployment

```bash
# View outputs
nx run prod-infra:terraform-output

# Check created file
cat packages/prod-infra/config-prod.txt
```

## Step 7: View Environment Dependencies

View the project graph to see all environments:

```bash
nx graph
```

You should see:
- `terraform-setup` (backend)
- `dev-infra` (depends on `terraform-setup`)
- `prod-infra` (depends on `terraform-setup`)

All environments share the same backend but have separate state files.

## Step 8: Understand State Isolation

Each environment has its own state:

### Development State
- Stored in: `dev-infra/terraform.tfstate` (local) or S3 key `dev-infra/terraform.tfstate` (remote)
- Isolated from production
- Can be modified independently

### Production State
- Stored in: `prod-infra/terraform.tfstate` (local) or S3 key `prod-infra/terraform.tfstate` (remote)
- Isolated from development
- Protected by stricter access controls

## Step 9: Make Environment-Specific Changes

### Update Development

Edit `packages/dev-infra/main.tf` and add a new resource:

```hcl
resource "local_file" "dev-only" {
  content  = "This is only in dev"
  filename = "${path.module}/dev-only.txt"
}
```

Apply to dev only:

```bash
nx run dev-infra:terraform-plan --configuration=dev
nx run dev-infra:terraform-apply --configuration=dev
```

Production remains unchanged.

### Update Production

Edit `packages/prod-infra/main.tf` and add a different resource:

```hcl
resource "local_file" "prod-only" {
  content  = "This is only in prod"
  filename = "${path.module}/prod-only.txt"
}
```

Apply to prod only:

```bash
nx run prod-infra:terraform-plan --configuration=prod
nx run prod-infra:terraform-apply --configuration=prod
```

## Step 10: Use Shared Modules

You can create shared modules that both environments use:

```bash
# Create a shared networking module
nx g nx-terraform:terraform-module networking
```

Edit `packages/dev-infra/main.tf`:

```hcl
module "networking" {
  source = "../../networking"
  vpc_cidr = "10.0.0.0/16"
}
```

Edit `packages/prod-infra/main.tf`:

```hcl
module "networking" {
  source = "../../networking"
  vpc_cidr = "10.1.0.0/16"
}
```

The plugin automatically detects these module references and creates dependencies.

## Best Practices

### 1. Environment Naming

Use clear, consistent naming:
- `dev-infra`, `staging-infra`, `prod-infra`
- Or: `infra-dev`, `infra-staging`, `infra-prod`

### 2. State Management

- Use remote backends for production
- Consider separate backends for prod vs dev/staging
- Enable state locking for production

### 3. Access Control

- Restrict production access to senior engineers
- Use different AWS accounts/regions for prod
- Implement approval workflows for prod changes

### 4. Configuration Management

- Keep environment configs in version control
- Use secrets management for sensitive values
- Document environment-specific requirements

### 5. Testing Strategy

- Test changes in dev first
- Promote to staging for integration testing
- Deploy to prod only after validation

## Common Patterns

### Pattern 1: Environment Tags

Add tags to identify environments:

```hcl
tags = {
  Environment = var.environment
  ManagedBy   = "nx-terraform"
}
```

### Pattern 2: Environment-Specific Resources

Use conditionals for environment-specific resources:

```hcl
resource "aws_instance" "monitoring" {
  count = var.environment == "prod" ? 1 : 0
  # ... monitoring instance config
}
```

### Pattern 3: Shared Backend, Separate States

All environments can share the same backend (S3 bucket) but use different state keys:
- `dev-infra/terraform.tfstate`
- `prod-infra/terraform.tfstate`

## Troubleshooting

### Issue: State Conflicts

If you see state conflicts, ensure:
- Each environment uses a different state key
- Backend is properly configured
- No manual state file copying between environments

### Issue: Configuration Drift

If environments drift apart:
- Review and sync variable definitions
- Use shared modules for common infrastructure
- Document environment-specific requirements

## Next Steps

- **Tutorial 5**: Learn about [Reusable Modules and Dependencies](/docs/tutorials/tutorial-05-reusable-modules)
- **Guides**: Read about [Configuration](/docs/guides/configuration) for more on tfvars and variables
- **Examples**: See [Multiple Environments Example](/docs/examples/multiple-environments)

## Summary

In this tutorial, you:

1. ✅ Created separate modules for dev and prod environments
2. ✅ Configured environment-specific variables and tfvars files
3. ✅ Deployed infrastructure to multiple environments
4. ✅ Understood state isolation between environments
5. ✅ Learned best practices for multi-environment management

You now know how to manage multiple environments with nx-terraform!

