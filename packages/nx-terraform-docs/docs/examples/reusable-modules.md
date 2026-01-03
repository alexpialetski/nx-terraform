---
sidebar_position: 3
---

# Reusable Modules Example

This example demonstrates creating and using reusable Terraform modules with automatic dependency detection.

## Scenario

You're building infrastructure with:
- A networking module (shared VPC and subnets)
- A security module (shared security groups)
- Multiple applications that use these modules

## Step 1: Create Reusable Modules

Create library modules for shared infrastructure:

```bash
# Networking module
nx g nx-terraform:terraform-module networking

# Security module
nx g nx-terraform:terraform-module security
```

## Step 2: Implement Networking Module

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

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

output "vpc_id" {
  description = "VPC ID"
  value       = "vpc-${replace(var.vpc_cidr, ".", "-")}"
}

output "subnet_ids" {
  description = "List of subnet IDs"
  value       = [for i in range(var.subnet_count) : "subnet-${i}"]
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = var.vpc_cidr
}
```

Edit `packages/networking/variables.tf`:

```hcl
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "subnet_count" {
  description = "Number of subnets to create"
  type        = number
  default     = 2
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}
```

Edit `packages/networking/outputs.tf`:

```hcl
output "vpc_id" {
  description = "The ID of the VPC"
  value       = "vpc-${replace(var.vpc_cidr, ".", "-")}"
}

output "subnet_ids" {
  description = "List of subnet IDs"
  value       = [for i in range(var.subnet_count) : "subnet-${i}"]
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = var.vpc_cidr
}
```

## Step 3: Implement Security Module

Edit `packages/security/main.tf`:

```hcl
variable "vpc_id" {
  description = "VPC ID from networking module"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

output "security_group_id" {
  description = "Security group ID"
  value       = "sg-${var.environment}-${replace(var.vpc_id, "vpc-", "")}"
}

output "security_group_name" {
  description = "Security group name"
  value       = "${var.environment}-sg"
}
```

## Step 4: Create Application Using Modules

Create a backend and application:

```bash
# Create backend
nx g nx-terraform:terraform-backend app-backend --backendType=aws-s3
nx run app-backend:terraform-apply

# Create application
nx g nx-terraform:terraform-module web-app --backendProject=app-backend
```

## Step 5: Use Modules in Application

Edit `packages/web-app/main.tf`:

```hcl
# Reference networking module
module "networking" {
  source = "../../networking"
  
  vpc_cidr      = "10.0.0.0/16"
  subnet_count  = 3
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Reference security module (uses networking output)
module "security" {
  source = "../../security"
  
  vpc_id      = module.networking.vpc_id
  environment = "production"
}

# Use module outputs
resource "local_file" "app_config" {
  content = <<-EOT
    VPC ID: ${module.networking.vpc_id}
    VPC CIDR: ${module.networking.vpc_cidr}
    Subnets: ${join(", ", module.networking.subnet_ids)}
    Security Group: ${module.security.security_group_id}
  EOT
  filename = "${path.module}/app-config.txt"
}

output "vpc_id" {
  value = module.networking.vpc_id
}

output "security_group_id" {
  value = module.security.security_group_id
}
```

## Step 6: Automatic Dependency Detection

The plugin automatically detects module references:

```bash
nx graph
```

Shows:
- `web-app` → `networking` (detected from module reference)
- `web-app` → `security` (detected from module reference)
- `web-app` → `app-backend` (from backendProject metadata)

## Step 7: Deploy

Deploy the application:

```bash
# Initialize (validates dependencies first)
nx run web-app:terraform-init

# Plan
nx run web-app:terraform-plan

# Apply
nx run web-app:terraform-apply
```

## Project Structure

```
packages/
├── app-backend/             # Backend
│   └── backend.config
├── networking/              # Reusable module (library)
│   ├── project.json         # projectType: library
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── security/                # Reusable module (library)
│   ├── project.json         # projectType: library
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── web-app/                 # Application (uses modules)
    ├── project.json         # References app-backend
    └── main.tf              # References networking and security
```

## Module Chain Example

Modules can depend on other modules:

Edit `packages/security/main.tf`:

```hcl
# Security module uses networking module
module "networking" {
  source = "../../networking"
  vpc_cidr = "10.1.0.0/16"
}

variable "environment" {
  type = string
}

output "security_group_id" {
  value = "sg-${var.environment}-${module.networking.vpc_id}"
}
```

This creates a dependency chain:
- `web-app` → `security` → `networking`

## Best Practices

1. **Clear Interfaces**: Define clear inputs and outputs
2. **Documentation**: Document module purpose and usage
3. **Versioning**: Consider versioning for shared modules
4. **Testing**: Test modules independently
5. **Reusability**: Design for multiple use cases

## Common Patterns

### Pattern 1: Infrastructure Modules

Modules that define infrastructure patterns:

```hcl
# packages/base-infrastructure/main.tf
# Common infrastructure pattern
```

### Pattern 2: Utility Modules

Modules that provide utilities:

```hcl
# packages/naming/main.tf
# Provides naming conventions
```

### Pattern 3: Composite Modules

Modules that combine other modules:

```hcl
# packages/application-stack/main.tf
module "networking" { ... }
module "security" { ... }
module "compute" { ... }
```

## Validation

Validate modules independently:

```bash
# Validate networking module
nx run networking:terraform-validate

# Format modules
nx run networking:terraform-fmt
nx run security:terraform-fmt
```

## Related Topics

- [Tutorial 5: Reusable Modules](/docs/tutorials/tutorial-05-reusable-modules)
- [Dependencies Guide](/docs/guides/dependencies)
- [Project Types Guide](/docs/guides/project-types)

