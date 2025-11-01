# Terraform Module Generator

## Overview

The `terraform-module` generator creates Terraform modules that can be either reusable library modules (without state) or stateful application modules (with remote state). Simple modules are ideal for reusable Terraform configurations that don't manage their own infrastructure state, while stateful modules are for infrastructure projects that need remote state management via a backend project.

## Usage

```bash
# Create simple module (library, no backend)
nx g @nx-terraform/plugin:terraform-module my-module --backendType=local

# Create stateful module (application with backend)
nx g @nx-terraform/plugin:terraform-module my-infra \
  --backendProject=shared-backend \
  --backendType=aws-s3

# Create stateful module with local backend
nx g @nx-terraform/plugin:terraform-module my-service \
  --backendProject=dev-backend \
  --backendType=local
```

## Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `name` | string | Yes | - | Name of the Terraform module (positional argument) |
| `backendType` | 'aws-s3' \| 'local' | Yes | - | Backend type (required even for simple modules) |
| `backendProject` | string | No | - | Name of existing backend project to use. When provided, creates a stateful module (application). When omitted, creates a simple module (library). |

## Module Types

### Simple Module (Library)

**Characteristics:**
- `projectType: 'library'`
- No `metadata.backendProject`
- No backend configuration
- Reusable Terraform code without state management
- Used by other projects via module references

**When to Use:**
- Creating reusable Terraform modules
- Library code that doesn't manage infrastructure
- Modules consumed by other Terraform projects
- Shared configurations, policies, or patterns

### Stateful Module (Application)

**Characteristics:**
- `projectType: 'application'`
- `metadata.backendProject` points to backend project
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
├── project.json              # projectType: 'library'
├── main.tf                    # Module resources
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── README.md                  # Module documentation
└── .gitignore                 # Terraform ignore patterns
```

### Stateful Module Structure

```
packages/{name}/
├── project.json              # projectType: 'application', metadata.backendProject
├── main.tf                   # Infrastructure resources
├── backend.tf                # Backend configuration (s3 or local)
├── provider.tf               # Provider requirements
├── variables.tf              # Input variables
├── outputs.tf                # Output values
├── README.md                 # Module documentation
└── .gitignore                # Terraform ignore patterns
```

### Generated Files

**All Modules:**
- `main.tf`: Main Terraform configuration with placeholder examples
- `variables.tf`: Template for input variable definitions
- `outputs.tf`: Template for output value definitions
- `README.md`: Module documentation with usage examples
- `.gitignore`: Standard Terraform ignore patterns

**Stateful Modules Only:**
- `backend.tf`: Backend configuration (s3 or local based on `backendType`)
- `provider.tf`: Provider requirements template

## Implementation Details

**Template System:**
- Uses `generateFiles` from `@nx/devkit`
- Template directories:
  - `files/simple-module/` for library modules
  - `files/stateful-module/` for application modules
- Template files use EJS with `__tmpl__` suffix pattern:
  - Files ending with `__tmpl__` are automatically renamed (e.g., `main.tf__tmpl__` → `main.tf`)
  - Requires `tmpl: ''` in substitution options

**Validation Logic:**
```typescript
if (normalizedOptions.backendProject) {
  // Validates backend project exists
  const backendConfig = readProjectConfiguration(tree, normalizedOptions.backendProject);
  if (!backendConfig) {
    throw new Error('Backend project not found');
  }
  
  // Requires backendType when backendProject is provided
  // (enforced by schema validation)
}
```

**Normalization:**
```typescript
const normalizeOptions = (options) => ({
  ...options,
  backendProject: options.backendProject || null,
  backendType: options.backendType || null,
  ignoreFile: '.gitignore',
  tmpl: '',  // Required to strip __tmpl__ suffix from template filenames
});
```

**Project Type Determination:**
- Simple module: `backendProject` is null/undefined → `projectType: 'library'`
- Stateful module: `backendProject` is provided → `projectType: 'application'`

**Backend Reference:**
Stateful modules include metadata:
```json
{
  "metadata": {
    "backendProject": "shared-backend"
  }
}
```

This enables automatic backend configuration lookup during `terraform-init`.

**Code Location:**
- Implementation: `packages/nx-terraform/src/generators/terraform-module/terraform-module.ts`
- Schema: `packages/nx-terraform/src/generators/terraform-module/schema.json`
- Templates: `packages/nx-terraform/src/generators/terraform-module/files/`

**EJS Template Features:**
- Conditionals in templates: `<% if (backendType === 'aws-s3') { %>`
- Variable substitution: `<%= name %>`, `<%= backendProject %>`
- Template files use `__tmpl__` suffix to avoid linting errors

## Examples

### Creating a Reusable Module

```bash
# Create simple networking module
nx g @nx-terraform/plugin:terraform-module networking \
  --backendType=local
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
nx g @nx-terraform/plugin:terraform-backend shared-backend --backendType=aws-s3

# Apply backend
nx run shared-backend:terraform-apply

# Create stateful module using backend
nx g @nx-terraform/plugin:terraform-module production-infra \
  --backendProject=shared-backend \
  --backendType=aws-s3
```

### Complete Workflow

```bash
# 1. Initialize plugin
nx g @nx-terraform/plugin:init

# 2. Create backend
nx g @nx-terraform/plugin:terraform-backend shared-backend --backendType=aws-s3
nx run shared-backend:terraform-apply

# 3. Create stateful module
nx g @nx-terraform/plugin:terraform-module web-app \
  --backendProject=shared-backend \
  --backendType=aws-s3

# 4. Initialize and deploy
nx run web-app:terraform-init
nx run web-app:terraform-plan
nx run web-app:terraform-apply
```

### Module with Local Backend

```bash
# Create local backend for development
nx g @nx-terraform/plugin:terraform-backend dev-backend --backendType=local
nx run dev-backend:terraform-apply

# Create module using local backend
nx g @nx-terraform/plugin:terraform-module dev-environment \
  --backendProject=dev-backend \
  --backendType=local
```

## Backend Configuration

Stateful modules automatically reference the backend via `terraform-init`:

```bash
terraform init -backend-config=../{backendProject}/backend.config -reconfigure
```

The backend configuration is pulled from the backend project's generated `backend.config` file.

## When to Use

### Simple Modules (Library)
- **Reusable configurations**: Common patterns, policies, or abstractions
- **Module libraries**: Shared code consumed by multiple projects
- **No state required**: Modules that don't manage infrastructure directly
- **Code organization**: Breaking down complex configurations into modules

### Stateful Modules (Application)
- **Infrastructure projects**: Projects that provision and manage resources
- **Production deployments**: Environments requiring remote state
- **Team collaboration**: Projects needing state locking
- **CI/CD pipelines**: Automated infrastructure deployment
- **Multi-environment**: Dev, staging, production with separate state

## Integration with Backend Projects

Stateful modules require a backend project to exist before creation:

1. **Create backend first:**
   ```bash
   nx g @nx-terraform/plugin:terraform-backend my-backend --backendType=aws-s3
   ```

2. **Apply backend** (generates `backend.config`):
   ```bash
   nx run my-backend:terraform-apply
   ```

3. **Create module referencing backend:**
   ```bash
   nx g @nx-terraform/plugin:terraform-module my-infra \
     --backendProject=my-backend \
     --backendType=aws-s3
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

- `backendType` is always required (even for simple modules) for API consistency
- Simple modules don't use `backendType` value but it must be provided due to schema requirements
- Stateful modules validate backend project existence before creation
- EJS templates use conditional logic to generate appropriate backend configuration
- Template files with `__tmpl__` suffix are automatically processed by `generateFiles`
- Simple modules have stub targets (modules don't have state to manage)
- Stateful modules get full Terraform lifecycle targets with proper dependencies

