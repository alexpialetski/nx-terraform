# nx-terraform

An [Nx](https://nx.dev) plugin for managing Terraform projects within an Nx monorepo. This plugin provides generators, automatic project discovery, and inferred tasks for Terraform infrastructure-as-code projects.

## Overview

The `nx-terraform` plugin enables you to manage Terraform projects alongside your other code in an Nx monorepo. It provides:

- **Automatic Project Discovery**: Automatically discovers Terraform projects based on `main.tf` files
- **Inferred Tasks**: Automatically creates Terraform targets (init, plan, apply, destroy, validate, fmt, output)
- **Generators**: Scaffold Terraform backend projects and modules
- **Target Dependencies**: Smart dependency management between Terraform projects
- **Caching**: Intelligent caching for safe operations (fmt, validate)

## Installation

### For New Workspaces

Create a new workspace with Terraform support:

```bash
npx create-nx-terraform-app my-workspace
```

This creates a new Nx workspace with the `nx-terraform` plugin already configured.

### For Existing Workspaces

Install the plugin in your existing Nx workspace:

```bash
nx add nx-terraform
```

This will:
- Add `nx-terraform` as a dependency
- Register the plugin in `nx.json`
- Enable automatic Terraform project discovery

## Quick Start

1. **Initialize the plugin** (if not using `create-nx-terraform-app`):
   ```bash
   nx g @nx-terraform/plugin:init
   ```

2. **Create a Terraform backend project**:
   ```bash
   nx g @nx-terraform/plugin:terraform-backend my-backend --backendType=aws-s3
   ```

3. **Apply the backend** (to create the state storage infrastructure):
   ```bash
   nx run my-backend:terraform-apply
   ```

4. **Create a Terraform module**:
   ```bash
   nx g @nx-terraform/plugin:terraform-module my-infra \
     --backendProject=my-backend \
     --backendType=aws-s3
   ```

5. **Use Terraform targets**:
   ```bash
   nx run my-infra:terraform-init
   nx run my-infra:terraform-plan
   nx run my-infra:terraform-apply
   ```

## Features

### Automatic Project Discovery

The plugin automatically discovers Terraform projects by looking for `main.tf` files in your workspace. Projects are detected based on:

- **Presence of `main.tf`**: Required for discovery
- **Project configuration**: Must have `project.json` in the same directory
- **Project type**: Determined by `projectType` and `metadata` in `project.json`

### Inferred Tasks

The plugin automatically creates these targets for each Terraform project:

- **terraform-init**: Initialize Terraform workspace
- **terraform-plan**: Create execution plan
- **terraform-apply**: Apply changes to infrastructure
- **terraform-destroy**: Destroy infrastructure
- **terraform-validate**: Validate Terraform configuration
- **terraform-fmt**: Format Terraform code
- **terraform-output**: Show Terraform outputs

### Project Types

The plugin supports three types of Terraform projects:

1. **Backend Projects** (`application` without `backendProject` metadata):
   - Manage remote state infrastructure (e.g., S3 bucket, DynamoDB table)
   - Generate `backend.config` files
   - Full target set with caching enabled

2. **Stateful Projects** (`application` with `backendProject` metadata):
   - Infrastructure projects that use remote state
   - Reference backend project via `metadata.backendProject`
   - Full target set (no caching for init/plan due to state)

3. **Module Projects** (`library`):
   - Reusable Terraform modules
   - No state management
   - Stub targets (modules don't have state)

### Smart Dependencies

The plugin automatically manages dependencies between Terraform projects:

- **Backend first**: Stateful projects depend on backend projects being applied
- **Init before operations**: Plan, apply, and validate require init
- **Plan before apply**: Apply depends on plan

### Caching

Intelligent caching for safe operations:

- **Cached**: `terraform-fmt`, `terraform-validate` (when safe)
- **Non-cached**: `terraform-init`, `terraform-plan`, `terraform-apply` (state-dependent)

## Generators

The plugin provides four generators:

### `init` Generator

Registers the `nx-terraform` plugin in your workspace.

```bash
nx g @nx-terraform/plugin:init
```

**Documentation**: [`packages/nx-terraform/src/generators/init/README.md`](./src/generators/init/README.md)

### `terraform-backend` Generator

Creates a Terraform backend project for managing remote state.

```bash
nx g @nx-terraform/plugin:terraform-backend my-backend --backendType=aws-s3
```

**Options**:
- `name`: Backend project name (required)
- `backendType`: 'aws-s3' or 'local' (required)
- `bucketNamePrefix`: Prefix for S3 bucket name (optional, AWS S3 only)

**Documentation**: [`packages/nx-terraform/src/generators/terraform-backend/README.md`](./src/generators/terraform-backend/README.md)

### `terraform-module` Generator

Creates Terraform modules (simple library or stateful application).

```bash
# Simple module (library)
nx g @nx-terraform/plugin:terraform-module my-module --backendType=local

# Stateful module (application)
nx g @nx-terraform/plugin:terraform-module my-infra \
  --backendProject=my-backend \
  --backendType=aws-s3
```

**Options**:
- `name`: Module name (required)
- `backendType`: 'aws-s3' or 'local' (required)
- `backendProject`: Backend project name (optional, creates stateful module if provided)

**Documentation**: [`packages/nx-terraform/src/generators/terraform-module/README.md`](./src/generators/terraform-module/README.md)

### `preset` Generator

Initializes workspace with Terraform setup (used by `create-nx-terraform-app`).

```bash
nx g @nx-terraform/plugin:preset --projectName=terraform-setup --backendType=aws-s3
```

**Documentation**: [`packages/nx-terraform/src/generators/preset/README.md`](./src/generators/preset/README.md)

## Targets

Each Terraform project automatically gets these targets:

### terraform-init

Initializes Terraform workspace.

```bash
nx run my-project:terraform-init
```

**Dependencies**: `^terraform-apply` (backend must be applied first)

### terraform-plan

Creates an execution plan.

```bash
nx run my-project:terraform-plan
```

**Dependencies**: `terraform-init`

**Configurations**: Supports `dev` and `prod` configurations via `-var-file` arguments

### terraform-apply

Applies changes to infrastructure.

```bash
nx run my-project:terraform-apply
```

**Dependencies**: `terraform-plan`

**Configurations**: Supports `dev` and `prod` configurations

### terraform-destroy

Destroys infrastructure.

```bash
nx run my-project:terraform-destroy
```

**Dependencies**: `terraform-init`

### terraform-validate

Validates Terraform configuration.

```bash
nx run my-project:terraform-validate
```

**Dependencies**: `terraform-init`

**Caching**: Enabled (safe operation)

### terraform-fmt

Formats Terraform code.

```bash
nx run my-project:terraform-fmt
```

**Caching**: Enabled (safe operation)

### terraform-output

Shows Terraform outputs.

```bash
nx run my-project:terraform-output
```

**Dependencies**: `terraform-init`

## Project Structure

Terraform projects should follow this structure:

```
packages/
  └── my-terraform-project/
      ├── project.json          # Nx project configuration
      ├── main.tf              # Required for discovery
      ├── backend.tf           # Backend configuration (stateful projects)
      ├── provider.tf          # Provider requirements
      ├── variables.tf         # Input variables
      ├── outputs.tf           # Output values
      ├── tfvars/
      │   ├── dev.tfvars       # Dev environment variables
      │   └── prod.tfvars      # Prod environment variables
      └── backend.config       # Generated backend config (backend projects)
```

### Project Configuration

For **stateful projects**, configure `metadata.backendProject`:

```json
{
  "root": "packages/my-infra",
  "projectType": "application",
  "metadata": {
    "backendProject": "my-backend"
  }
}
```

## Configuration

### Backend Types

The plugin supports two backend types:

#### AWS S3 Backend

Production-ready remote state storage using AWS S3:

```bash
nx g @nx-terraform/plugin:terraform-backend my-backend --backendType=aws-s3
```

**Features**:
- Versioning enabled
- Object lock for state protection
- Dynamic bucket naming
- Region detection

#### Local Backend

Local state files for development:

```bash
nx g @nx-terraform/plugin:terraform-backend my-backend --backendType=local
```

**Use Cases**:
- Development and testing
- Single-user scenarios
- Ephemeral environments

### Environment Variables

Terraform projects support environment-specific variables via `tfvars` files:

- `tfvars/dev.tfvars` - Development environment
- `tfvars/prod.tfvars` - Production environment

Targets automatically use the appropriate `-var-file` argument based on configuration:

```bash
# Uses tfvars/dev.tfvars
nx run my-project:terraform-plan --configuration=dev

# Uses tfvars/prod.tfvars
nx run my-project:terraform-plan --configuration=prod
```

## Examples

### Complete Workflow

```bash
# 1. Create new workspace (creates terraform-setup backend and terraform-infra module)
npx create-nx-terraform-app my-workspace

# 2. Apply backend (from workspace creation)
cd my-workspace
nx run terraform-setup:terraform-apply

# 3. Plan and apply infrastructure module (already created by preset)
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan --configuration=dev
nx run terraform-infra:terraform-apply --configuration=dev

# 4. (Optional) Create additional infrastructure modules
nx g @nx-terraform/plugin:terraform-module web-infra \
  --backendProject=terraform-setup \
  --backendType=aws-s3
```

### Multiple Environments

```bash
# Create dev environment
nx g @nx-terraform/plugin:terraform-module dev-infra \
  --backendProject=terraform-setup \
  --backendType=aws-s3

# Create prod environment
nx g @nx-terraform/plugin:terraform-module prod-infra \
  --backendProject=terraform-setup \
  --backendType=aws-s3

# Deploy to dev
nx run dev-infra:terraform-plan --configuration=dev
nx run dev-infra:terraform-apply --configuration=dev

# Deploy to prod
nx run prod-infra:terraform-plan --configuration=prod
nx run prod-infra:terraform-apply --configuration=prod
```

### Reusable Modules

```bash
# Create reusable networking module
nx g @nx-terraform/plugin:terraform-module networking --backendType=local

# Use in other projects via module reference:
# module "networking" {
#   source = "../../packages/networking"
#   ...
# }
```

## Project Discovery

The plugin automatically discovers Terraform projects using:

- **Pattern**: `**/main.tf` (looks for `main.tf` files recursively)
- **Requirement**: Projects must have `project.json` in the same directory
- **Type Detection**: Based on `projectType` and `metadata.backendProject`

Projects are discovered on workspace load, so new projects are automatically available without restarting Nx.

## Caching Strategy

Caching behavior varies by project type:

### Backend Projects (caching enabled)

- **terraform-init**: Cached (backend projects don't depend on external state)
- **terraform-plan**: Cached
- **terraform-apply**: Cached
- **terraform-fmt**: Cached (code formatting is deterministic)
- **terraform-validate**: Cached (validation results can be cached when inputs haven't changed)
- **terraform-destroy**: Not cached
- **terraform-output**: Not cached

### Stateful Projects (caching disabled for state-dependent operations)

- **terraform-init**: Not cached (state-dependent, requires backend access)
- **terraform-plan**: Not cached (state-dependent, shows infrastructure changes)
- **terraform-apply**: Not cached (state-dependent, modifies infrastructure)
- **terraform-fmt**: Cached (code formatting is deterministic)
- **terraform-validate**: Cached (validation results can be cached when inputs haven't changed)
- **terraform-destroy**: Not cached
- **terraform-output**: Not cached

### Module Projects (library)

- **terraform-fmt**: Cached
- **terraform-validate**: Cached
- **terraform-apply**: Not cached (though modules typically don't use apply)
- All other targets are stubs (cached but no-op)

Cache inputs include:
- All `.tf` and `.tfvars` files
- Relevant environment variables
- Terraform version
- Provider and backend configuration files

## Compatibility

- **Nx**: v22.0.2 or compatible
- **Terraform**: Any version (uses Terraform CLI)
- **Node.js**: v18+ recommended

## Documentation

Comprehensive documentation is available for each component:

- **Generators**:
  - [`init`](./src/generators/init/README.md) - Plugin initialization
  - [`terraform-backend`](./src/generators/terraform-backend/README.md) - Backend project creation
  - [`terraform-module`](./src/generators/terraform-module/README.md) - Module creation
  - [`preset`](./src/generators/preset/README.md) - Workspace preset

- **Workspace Creation**:
  - [`create-nx-terraform-app`](../create-nx-terraform-app/README.md) - CLI tool for workspace creation

## Contributing

Contributions are welcome! Please see the repository for contribution guidelines.

## License

MIT

## Repository

https://github.com/alexpialetski/nx-terraform
