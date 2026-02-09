---
sidebar_position: 6
---

# Configuration

Terraform projects in nx-terraform support various configuration options for managing environment-specific variables, backend settings, and project metadata. Understanding configuration options helps you manage complex infrastructure setups.

## Overview

Configuration in nx-terraform includes:

1. **Environment Variables** - Using `tfvars` files
2. **Backend Configuration** - Connecting to backends
3. **Project Metadata** - Project type and relationships
4. **Target Configurations** - Environment-specific target runs

## Environment Variables (tfvars)

Terraform projects support environment-specific variables via `tfvars` files.

### Structure

```
packages/my-infra/
├── main.tf
├── variables.tf
└── tfvars/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

### Variable Definitions

Define variables in `variables.tf`:

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

### tfvars Files

Create environment-specific values:

**dev.tfvars:**

```hcl
environment    = "dev"
instance_count = 1
instance_type  = "t3.micro"
```

**prod.tfvars:**

```hcl
environment    = "prod"
instance_count = 3
instance_type  = "t3.large"
```

### Using Configurations

You can pass different var files per environment using Nx configurations in your `project.json` by overriding the `args` array:

```json
{
  "targets": {
    "terraform-plan": {
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
}
```

Paths in `-var-file` are relative to the project root (where the command runs). Then use configurations with targets:

```bash
# Plan with dev configuration (default)
nx run my-infra:terraform-plan

# Plan with prod configuration
nx run my-infra:terraform-plan --configuration=prod
```

The configurations override the `args` to use different var files:

- Default → uses `tfvars/dev.tfvars`
- `--configuration=prod` → uses `tfvars/prod.tfvars`

## Backend Configuration

### Backend Projects

Backend projects generate `backend.config` after applying:

```hcl
# packages/terraform-setup/backend.config
bucket = "my-workspace-terraform-setup-abc123"
key    = "terraform-setup/terraform.tfstate"
region = "us-east-1"
dynamodb_table = "terraform-setup-lock"
encrypt = true
```

### Stateful Projects

Stateful projects reference the backend:

```hcl
# packages/my-infra/backend.tf
terraform {
  backend "s3" {
    config_file = "../../terraform-setup/backend.config"
  }
}
```

Or for local backend:

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### Backend Configuration Options

#### AWS S3 Backend

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "my-project/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

#### Local Backend

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

## Project Metadata and Target Options

### Backend Project

Backend projects do not set `terraform-init.metadata.backendProject` (they are the backend themselves). They have no `terraform-init` target metadata for backend:

```json
{
  "root": "packages/terraform-setup",
  "projectType": "application"
}
```

### Stateful Project

Stateful projects reference their backend via **terraform-init target metadata**:

```json
{
  "root": "packages/my-infra",
  "projectType": "application",
  "targets": {
    "terraform-init": {
      "metadata": { "backendProject": "terraform-setup" }
    }
  },
  "metadata": {
    "nx-terraform": {
      "projectType": "stateful"
    }
  }
}
```

### Module Project Metadata

Module projects have `metadata['nx-terraform'].projectType: 'module'`:

```json
{
  "root": "packages/networking",
  "projectType": "application",
  "metadata": {
    "nx-terraform": { "projectType": "module" }
  }
}
```

## Target Configurations

### Configuration Support

Targets support configurations by overriding the `args` array to pass different `-var-file` arguments:

```json
{
  "targets": {
    "terraform-plan": {
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
}
```

Use configurations with targets:

```bash
# Uses tfvars/dev.tfvars
nx run my-infra:terraform-plan

# Uses tfvars/prod.tfvars
nx run my-infra:terraform-plan --configuration=prod
```

### Supported Targets

These targets support configurations:

- `terraform-plan`
- `terraform-destroy`

Note: `terraform-apply` uses the plan file from `terraform-plan`, so it doesn't need a var file argument.

### Configuration Pattern

The recommended pattern is to override `args` in your `project.json` target configurations for different environments:

Example `project.json`:

```json
{
  "targets": {
    "terraform-plan": {
      "options": {
        "args": ["-var-file=tfvars/dev.tfvars"]
      },
      "configurations": {
        "prod": {
          "args": ["-var-file=tfvars/prod.tfvars"]
        },
        "staging": {
          "args": ["-var-file=tfvars/staging.tfvars"]
        }
      }
    }
  }
}
```

## Environment Variables

### Terraform Environment Variables

Set Terraform-specific environment variables:

```bash
export TF_LOG=DEBUG
export TF_VAR_instance_count=5
nx run my-infra:terraform-plan
```

### Provider Environment Variables

Set provider-specific variables:

```bash
# AWS
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1

# Azure
export ARM_CLIENT_ID=your-client-id
export ARM_CLIENT_SECRET=your-secret
```

## Project Configuration Files

### project.json

Main project configuration:

```json
{
  "root": "packages/my-infra",
  "sourceRoot": "packages/my-infra",
  "projectType": "application",
  "targets": {
    "terraform-init": { "metadata": { "backendProject": "terraform-setup" }, ... },
    "terraform-plan": { ... }
  },
  "metadata": {
    "nx-terraform": {
      "projectType": "module"
    }
  }
}
```

Individual projects can override the default command arguments by defining their own `args` in target configurations.

## Configuration Best Practices

### 1. Environment Separation

- Use separate `tfvars` files per environment
- Keep environment configs in version control
- Document environment-specific requirements

### 2. Variable Management

- Use clear variable names
- Provide sensible defaults
- Document variable purposes
- Use type constraints

### 3. Backend Configuration

- Use `backend.config` for consistency
- Keep backend configs in version control (if safe)
- Document backend requirements

### 4. Secrets Management

- Don't commit secrets to `tfvars`
- Use environment variables for secrets
- Consider secret management tools
- Use `.gitignore` for sensitive files

## Configuration Examples

### Example 1: Multi-Environment Setup

```
packages/
  ├── terraform-setup/      # Backend
  └── web-infra/            # Infrastructure
      ├── main.tf
      ├── variables.tf
      └── tfvars/
          ├── dev.tfvars
          └── prod.tfvars
```

### Example 2: Shared Variables

Create a shared variables file:

```hcl
# shared.tfvars
common_tag = "managed-by-terraform"
```

Reference in environment files:

```hcl
# dev.tfvars
environment = "dev"
instance_count = 1
```

### Example 3: Conditional Configuration

Use variables for conditional logic:

```hcl
# main.tf
resource "aws_instance" "example" {
  count = var.environment == "prod" ? 3 : 1
  # ...
}
```

## Troubleshooting

For configuration issues, see the [Troubleshooting Guide](/docs/guides/troubleshooting#configuration-issues).

## Related Topics

- [Backend Types](/docs/guides/backend-types) - Learn about backend configuration
- [Project Types](/docs/guides/project-types) - Understand project metadata
- [Multiple Environments Example](/docs/examples/multiple-environments) - Practical configuration examples
