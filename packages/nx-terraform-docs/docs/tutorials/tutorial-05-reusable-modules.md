---
sidebar_position: 5
---

# Tutorial 5: Reusable Modules and Dependencies

In this tutorial, you'll learn how to create reusable Terraform modules and how nx-terraform automatically detects and manages dependencies between modules. This enables code reuse and proper dependency ordering.

## What You'll Learn

- How to create reusable Terraform modules (library type)
- How to reference modules in your infrastructure
- How automatic dependency detection works
- How to view and understand the dependency graph
- Best practices for module design

## Prerequisites

- Completed [Tutorial 3: Create Your First Infrastructure Module](/docs/tutorials/tutorial-03-first-module)
- Understanding of Terraform module syntax

## Understanding Module Types

nx-terraform supports two types of modules:

### Library Modules (Reusable)

- **Type**: `library` project type
- **Purpose**: Reusable Terraform code without state
- **State**: No state management (modules don't have state)
- **Use Case**: Shared infrastructure patterns, common configurations

### Application Modules (Stateful)

- **Type**: `application` project type
- **Purpose**: Infrastructure with state
- **State**: Manages infrastructure state
- **Use Case**: Actual deployed infrastructure

## Step 1: Create a Reusable Module

Create a networking module that can be reused:

```bash
nx g nx-terraform:terraform-module networking
```

This creates a library-type module (no `--backendProject` flag means it's a simple module).

### Verify Module Type

```bash
cat packages/networking/project.json
```

You should see:
- `projectType: "library"` - This is a library module
- No `backendProject` metadata - Library modules don't use backends

## Step 2: Design Your Module

Edit `packages/networking/main.tf` to create a reusable networking module:

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

# Output values that consuming modules can use
output "vpc_id" {
  description = "VPC ID"
  value       = "vpc-${var.vpc_cidr}" # Placeholder - use real resource in production
}

output "subnet_ids" {
  description = "List of subnet IDs"
  value       = [for i in range(var.subnet_count) : "subnet-${i}"]
}
```

### Module Structure

A good reusable module should:
- Have clear input variables
- Provide useful outputs
- Be well-documented
- Be generic enough to reuse

## Step 3: Create Variables and Outputs

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

variable "environment" {
  description = "Environment name"
  type        = string
  default     = ""
}
```

Edit `packages/networking/outputs.tf`:

```hcl
output "vpc_id" {
  description = "The ID of the VPC"
  value       = "vpc-${var.vpc_cidr}"
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

## Step 4: Use the Module in Infrastructure

Now let's use this module in your infrastructure. Edit `packages/terraform-infra/main.tf`:

```hcl
module "networking" {
  source = "../../networking"
  
  vpc_cidr     = "10.0.0.0/16"
  subnet_count = 3
  environment  = "production"
}

# Use the module outputs
resource "local_file" "network_config" {
  content = <<-EOT
    VPC ID: ${module.networking.vpc_id}
    Subnet IDs: ${join(", ", module.networking.subnet_ids)}
    VPC CIDR: ${module.networking.vpc_cidr}
  EOT
  filename = "${path.module}/network-config.txt"
}

output "vpc_id" {
  value = module.networking.vpc_id
}
```

## Step 5: Understand Automatic Dependency Detection

The nx-terraform plugin automatically detects module references and creates project dependencies.

### How It Works

1. **Scanning**: The plugin scans `.tf` files for `module` blocks
2. **Path Extraction**: Extracts `source` attributes with local paths (`./` or `../`)
3. **Matching**: Matches the last path segment to project names
4. **Dependency Creation**: Creates a static dependency from the referencing project to the referenced project

### Verify Dependencies

View the project graph:

```bash
nx graph
```

You should see:
- `terraform-infra` → `networking` (dependency arrow)

This means `terraform-infra` depends on `networking`.

### Check Dependency Details

```bash
nx show project terraform-infra --json | jq '.implicitDependencies'
```

You should see `networking` in the list.

## Step 6: Test the Dependency

The dependency ensures proper execution order:

### Run Operations

```bash
# This will automatically build/validate networking first
nx run terraform-infra:terraform-validate
```

The plugin ensures `networking` is validated before `terraform-infra`.

### View Execution Order

```bash
nx run-many --target=terraform-validate --all
```

You'll see `networking` runs before `terraform-infra` due to the dependency.

## Step 7: Create Multiple Module References

Create another reusable module:

```bash
nx g nx-terraform:terraform-module security
```

Edit `packages/security/main.tf`:

```hcl
variable "environment" {
  description = "Environment name"
  type        = string
}

output "security_group_id" {
  value = "sg-${var.environment}"
}
```

Now reference both modules in your infrastructure:

```hcl
module "networking" {
  source = "../../networking"
  vpc_cidr = "10.0.0.0/16"
}

module "security" {
  source = "../../security"
  environment = "prod"
}

# Use outputs from both modules
resource "local_file" "infra_config" {
  content = <<-EOT
    VPC: ${module.networking.vpc_id}
    Security Group: ${module.security.security_group_id}
  EOT
  filename = "${path.module}/infra-config.txt"
}
```

### View Multiple Dependencies

```bash
nx graph
```

You should see:
- `terraform-infra` → `networking`
- `terraform-infra` → `security`

## Step 8: Create Module Chains

Modules can depend on other modules:

Edit `packages/security/main.tf`:

```hcl
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

Now you have a dependency chain:
- `terraform-infra` → `security` → `networking`

### View the Chain

```bash
nx graph
```

You'll see the full dependency chain visualized.

## Step 9: Understand Module vs Project Dependencies

### Module Dependencies (Terraform)

These are Terraform-level dependencies:
- Defined in `.tf` files using `module` blocks
- Used at Terraform execution time
- Create project dependencies automatically

### Project Dependencies (Nx)

These are Nx-level dependencies:
- Created automatically from module references
- Used for execution ordering
- Visible in `nx graph`

Both work together to ensure proper ordering.

## Step 10: Best Practices for Reusable Modules

### 1. Clear Interface

Define clear inputs and outputs:

```hcl
# Good: Clear, documented variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

# Bad: Unclear purpose
variable "cidr" {
  type = string
}
```

### 2. Versioning

Consider versioning for shared modules:

```hcl
module "networking" {
  source = "../../networking"
  # Consider: source = "../../networking?ref=v1.0.0"
}
```

### 3. Documentation

Document your modules:

```hcl
# README.md in module directory
# Describes:
# - Purpose
# - Inputs
# - Outputs
# - Examples
```

### 4. Testing

Test modules independently:

```bash
# Validate module
nx run networking:terraform-validate

# Format module
nx run networking:terraform-fmt
```

### 5. Reusability

Design for reuse:
- Avoid hardcoded values
- Use variables for customization
- Provide sensible defaults
- Support multiple use cases

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

## Troubleshooting

### Issue: Dependency Not Detected

If a dependency isn't detected:
- Ensure the `source` path uses relative paths (`./` or `../`)
- Check that the referenced project name matches the directory name
- Verify the module block syntax is correct

### Issue: Circular Dependencies

If you see circular dependency errors:
- Review your module structure
- Break circular dependencies by extracting common code
- Use data sources instead of module references where appropriate

## Next Steps

- **Guides**: Read about [Dependencies](/docs/guides/dependencies) for more details
- **Examples**: See [Reusable Modules Example](/docs/examples/reusable-modules)
- **Reference**: Check [Generator Documentation](/docs/reference/generators/terraform-module)

## Summary

In this tutorial, you:

1. ✅ Created a reusable library module
2. ✅ Referenced modules in your infrastructure
3. ✅ Understood automatic dependency detection
4. ✅ Created module chains and multiple references
5. ✅ Learned best practices for module design

You now know how to create and use reusable modules with automatic dependency management!

