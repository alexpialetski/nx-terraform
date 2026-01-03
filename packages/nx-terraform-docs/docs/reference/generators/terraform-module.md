---
sidebar_position: 3
---

# terraform-module Generator

The `terraform-module` generator creates Terraform modules that can be either reusable library modules (without state) or stateful application modules (with remote state).

## Usage

```bash
# Create simple module (library, no backend)
nx g nx-terraform:terraform-module my-module

# Create stateful module (application with backend)
nx g nx-terraform:terraform-module my-infra \
  --backendProject=shared-backend
```

## Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `name` | string | Yes | - | Name of the Terraform module (positional argument) |
| `backendProject` | string | No | - | Name of existing backend project to use. When provided, creates a stateful module connected to the backend. The backend type is automatically derived from the backend project's metadata. When omitted, creates a simple standalone module. |

## Module Types

### Simple Module

**Characteristics:**
- `projectType: 'application'`
- `metadata['nx-terraform'].projectType: 'module'`
- No `metadata['nx-terraform'].backendProject`
- No backend configuration
- Reusable Terraform code without state management
- Used by other projects via module references

**When to Use:**
- Creating reusable Terraform modules
- Library code that doesn't manage infrastructure
- Modules consumed by other Terraform projects
- Shared configurations, policies, or patterns

### Stateful Module

**Characteristics:**
- `projectType: 'application'`
- `metadata['nx-terraform'].projectType: 'module'`
- `metadata['nx-terraform'].backendProject` points to backend project
- Backend configuration references `backend.config` from backend project
- Manages its own infrastructure state
- Full Terraform lifecycle support

**When to Use:**
- Infrastructure projects that provision resources
- Projects requiring remote state management
- Production infrastructure deployments
- Projects that need state locking and collaboration

## What It Creates

### Simple Module Structure

```
packages/{name}/
├── project.json              # projectType: 'application', metadata['nx-terraform'].projectType: 'module'
├── main.tf                    # Module resources
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── README.md                  # Module documentation
└── .gitignore                 # Terraform ignore patterns
```

### Stateful Module Structure

```
packages/{name}/
├── project.json              # projectType: 'application', metadata['nx-terraform'].projectType: 'module', metadata['nx-terraform'].backendProject
├── main.tf                   # Infrastructure resources
├── backend.tf                 # Backend configuration (s3 or local)
├── provider.tf                # Provider requirements
├── variables.tf              # Input variables
├── outputs.tf                # Output values
├── README.md                 # Module documentation
└── .gitignore                # Terraform ignore patterns
```

## Examples

### Creating a Reusable Module

```bash
# Create simple networking module
nx g nx-terraform:terraform-module networking
```

Use in other projects:
```hcl
module "networking" {
  source = "../../packages/networking"
  
  vpc_cidr = "10.0.0.0/16"
  subnet_count = 3
}
```

### Creating Stateful Infrastructure

```bash
# First, create backend
nx g nx-terraform:terraform-backend shared-backend --backendType=aws-s3

# Apply backend
nx run shared-backend:terraform-apply

# Create stateful module using backend
nx g nx-terraform:terraform-module production-infra \
  --backendProject=shared-backend
```

### Complete Workflow

```bash
# 1. Initialize plugin
nx g nx-terraform:init

# 2. Create backend
nx g nx-terraform:terraform-backend shared-backend --backendType=aws-s3
nx run shared-backend:terraform-apply

# 3. Create stateful module
nx g nx-terraform:terraform-module web-app \
  --backendProject=shared-backend

# 4. Initialize and deploy
nx run web-app:terraform-init
nx run web-app:terraform-plan
nx run web-app:terraform-apply
```

## Backend Configuration

Stateful modules automatically reference the backend via `terraform-init`:

```bash
terraform init -backend-config=../{backendProject}/backend.config -reconfigure
```

The backend configuration is pulled from the backend project's generated `backend.config` file.

## Integration with Backend Projects

Stateful modules require a backend project to exist before creation:

1. **Create backend first:**
   ```bash
   nx g nx-terraform:terraform-backend my-backend --backendType=aws-s3
   ```

2. **Apply backend** (generates `backend.config`):
   ```bash
   nx run my-backend:terraform-apply
   ```

3. **Create module referencing backend:**
   ```bash
   nx g nx-terraform:terraform-module my-infra \
     --backendProject=my-backend
   ```

The generator validates that the backend project exists before creating the module.

## Target Dependencies

Stateful modules have automatic target dependencies:
- `terraform-init` depends on `^terraform-apply` (backend must be applied first)
- `terraform-plan` depends on `terraform-init`
- `terraform-apply` depends on `terraform-plan`

This ensures proper initialization order.

## Related Generators

- **init**: Registers the plugin (required before creating modules)
- **terraform-backend**: Creates backend projects that stateful modules reference
- **preset**: Complete workspace setup including backend and plugin registration

## Notes

- `backendType` is automatically derived from the backend project's metadata when `backendProject` is provided
- Simple modules don't require a backend project or backend type
- Stateful modules validate backend project existence and retrieve backend type from metadata
- Simple modules have stub targets (modules don't have state to manage)
- Stateful modules get full Terraform lifecycle targets with proper dependencies

