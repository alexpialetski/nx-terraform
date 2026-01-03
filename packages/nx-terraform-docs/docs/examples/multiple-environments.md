---
sidebar_position: 2
---

# Multiple Environments Example

This example demonstrates managing multiple environments (dev, staging, prod) using separate Terraform modules with environment-specific configurations.

## Scenario

You need to manage infrastructure for three environments:
- Development (dev) - Small, cost-effective
- Staging (staging) - Similar to production
- Production (prod) - Full scale, high availability

## Step 1: Create Backend

Create a shared backend for all environments:

```bash
nx g nx-terraform:terraform-backend shared-backend --backendType=aws-s3
nx run shared-backend:terraform-apply
```

## Step 2: Create Environment Modules

Create separate modules for each environment:

```bash
# Development environment
nx g nx-terraform:terraform-module dev-infra \
  --backendProject=shared-backend

# Staging environment
nx g nx-terraform:terraform-module staging-infra \
  --backendProject=shared-backend

# Production environment
nx g nx-terraform:terraform-module prod-infra \
  --backendProject=shared-backend
```

## Step 3: Configure Environment Variables

### Development Configuration

Edit `packages/dev-infra/variables.tf`:

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

variable "instance_type" {
  description = "Instance type"
  type        = string
}
```

Create `packages/dev-infra/tfvars/dev.tfvars`:

```hcl
environment    = "dev"
instance_count = 1
instance_type  = "t3.micro"
```

### Staging Configuration

Create `packages/staging-infra/tfvars/staging.tfvars`:

```hcl
environment    = "staging"
instance_count = 2
instance_type  = "t3.small"
```

### Production Configuration

Create `packages/prod-infra/tfvars/prod.tfvars`:

```hcl
environment    = "prod"
instance_count = 5
instance_type  = "t3.large"
```

## Step 4: Deploy to Development

Deploy the development environment:

```bash
# Initialize
nx run dev-infra:terraform-init

# Plan
nx run dev-infra:terraform-plan --configuration=dev

# Apply
nx run dev-infra:terraform-apply --configuration=dev
```

## Step 5: Deploy to Staging

Deploy the staging environment:

```bash
# Initialize
nx run staging-infra:terraform-init

# Plan
nx run staging-infra:terraform-plan --configuration=staging

# Apply
nx run staging-infra:terraform-apply --configuration=staging
```

## Step 6: Deploy to Production

Deploy the production environment:

```bash
# Initialize
nx run prod-infra:terraform-init

# Plan (review carefully!)
nx run prod-infra:terraform-plan --configuration=prod

# Apply (with caution!)
nx run prod-infra:terraform-apply --configuration=prod
```

## Environment-Specific Infrastructure

You can create environment-specific resources:

```hcl
# packages/dev-infra/main.tf
resource "aws_instance" "dev" {
  count         = var.instance_count
  instance_type = var.instance_type
  
  tags = {
    Environment = var.environment
    ManagedBy   = "nx-terraform"
  }
}

# Only in production
resource "aws_cloudwatch_alarm" "prod_monitoring" {
  count = var.environment == "prod" ? 1 : 0
  # ... monitoring configuration
}
```

## Project Structure

```
packages/
├── shared-backend/          # Shared backend
│   └── backend.config
├── dev-infra/               # Development
│   ├── main.tf
│   ├── variables.tf
│   └── tfvars/
│       └── dev.tfvars
├── staging-infra/           # Staging
│   ├── main.tf
│   ├── variables.tf
│   └── tfvars/
│       └── staging.tfvars
└── prod-infra/             # Production
    ├── main.tf
    ├── variables.tf
    └── tfvars/
        └── prod.tfvars
```

## Dependency Graph

```bash
nx graph
```

Shows:
- `dev-infra` → `shared-backend`
- `staging-infra` → `shared-backend`
- `prod-infra` → `shared-backend`

All environments share the same backend but have separate state files.

## State Isolation

Each environment has its own state:
- `dev-infra/terraform.tfstate` (or S3 key)
- `staging-infra/terraform.tfstate`
- `prod-infra/terraform.tfstate`

This ensures complete isolation between environments.

## Best Practices

1. **Separate State Files**: Each environment has its own state
2. **Environment Tags**: Tag resources with environment name
3. **Access Control**: Restrict production access
4. **Testing**: Test in dev, validate in staging, deploy to prod
5. **Documentation**: Document environment-specific requirements

## Common Workflows

### Deploy to All Environments

```bash
# Deploy to dev
nx run dev-infra:terraform-apply --configuration=dev

# Deploy to staging
nx run staging-infra:terraform-apply --configuration=staging

# Deploy to prod (with approval)
nx run prod-infra:terraform-apply --configuration=prod
```

### Update Single Environment

```bash
# Make changes to dev-infra/main.tf
# Plan and apply
nx run dev-infra:terraform-plan --configuration=dev
nx run dev-infra:terraform-apply --configuration=dev
```

### Promote Changes

```bash
# 1. Test in dev
nx run dev-infra:terraform-apply --configuration=dev

# 2. Validate in staging
nx run staging-infra:terraform-apply --configuration=staging

# 3. Deploy to prod
nx run prod-infra:terraform-apply --configuration=prod
```

