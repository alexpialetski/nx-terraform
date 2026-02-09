---
sidebar_position: 3
---

# Workspace Creation

The `create-nx-terraform-app` CLI tool provides an interactive setup experience for creating new Nx workspaces pre-configured with Terraform support.

## Overview

`create-nx-terraform-app` is an executable npm package that scaffolds a new Nx workspace with Terraform infrastructure-as-code capabilities. It guides you through an interactive setup process to configure your workspace with appropriate Terraform backend type and project settings.

## Basic Usage

### Interactive Mode

Run the command without options to be guided through the setup:

```bash
npx create-nx-terraform-app my-terraform-workspace
```

You'll be prompted for:

1. **Project name**: Name of your workspace/project
2. **Terraform backend type**: Choose between:
   - `aws-s3`: AWS S3 remote backend (production-ready, supports state locking)
   - `local`: Local backend (development, state files stored locally)
3. **Package manager**: npm, yarn, or pnpm
4. **Nx Cloud**: Option to connect to Nx Cloud for distributed caching
5. **Git options**: Initialize git repository, set default branch

### Non-Interactive Mode

Provide all options directly for CI/CD or automation:

```bash
npx create-nx-terraform-app my-workspace \
  --backendType=aws-s3 \
  --packageManager=npm \
  --nxCloud=false \
  --git=true
```

## Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `[name]` or `projectName` | string | Workspace/project name | - |
| `--backendType` | 'aws-s3' \| 'local' | Terraform backend type | Prompted |
| `--packageManager` | 'npm' \| 'yarn' \| 'pnpm' | Package manager to use | Prompted |
| `--nxCloud` | boolean | Connect to Nx Cloud | Prompted |
| `--git` | boolean | Initialize git repository | true |
| `--defaultBase` | string | Default git branch | 'main' |

## What Gets Created

After running `create-nx-terraform-app`, you get a complete Nx workspace:

```
my-terraform-workspace/
├── nx.json                    # Nx configuration with nx-terraform plugin
├── package.json              # Workspace dependencies
├── .gitignore                # Git ignore patterns
└── packages/
    ├── terraform-setup/      # Initial Terraform backend project
    │   ├── project.json
    │   ├── main.tf
    │   ├── backend.tf
    │   ├── provider.tf
    │   ├── variables.tf
    │   └── backend.config    # Generated after first apply
    └── terraform-infra/      # Initial Terraform stateful module
        ├── project.json      # Contains targets['terraform-init'].metadata.backendProject: 'terraform-setup'
        ├── main.tf
        ├── backend.tf        # References terraform-setup backend
        ├── provider.tf
        ├── variables.tf
        └── outputs.tf
```

### Workspace Configuration

- **Nx Plugin**: `nx-terraform` automatically registered in `nx.json`
- **Backend Project**: Initial Terraform backend project at `packages/terraform-setup/`
- **Stateful Module**: Initial Terraform infrastructure module at `packages/terraform-infra/` (connected to backend)
- **Backend Type**: Configured based on your selection (AWS S3 or local), used for both projects
- **Package Manager**: Dependencies installed with your chosen manager

## Backend Types

Choose between **AWS S3** (production-ready, remote state) or **Local** (development, local files) backend types.

:::info
For a detailed comparison of backend types, see the [Backend Types Guide](/docs/guides/backend-types).
:::

## Next Steps After Creation

Once your workspace is created:

### 1. Apply Backend (if using remote backend)

```bash
cd my-terraform-workspace
nx run terraform-setup:terraform-apply
```

This creates the S3 bucket and DynamoDB table (if using AWS S3 backend) for state storage.

### 2. Initialize and Deploy Infrastructure Module

The infrastructure module is already created and connected to the backend:

```bash
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan --configuration=dev
nx run terraform-infra:terraform-apply --configuration=dev
```

### 3. Create Additional Modules (Optional)

```bash
# Simple module (library)
nx g nx-terraform:terraform-module my-module

# Stateful module (application)
nx g nx-terraform:terraform-module my-infra \
  --backendProject=terraform-setup
```

### 4. Start Developing

- Edit Terraform files in `packages/terraform-setup/` or `packages/terraform-infra/`
- Run `nx graph` to see project relationships
- Use `nx run <project>:terraform-plan` to preview changes

## Integration with Preset Generator

This CLI tool is a wrapper around the `preset` generator. The relationship:

- **create-nx-terraform-app**: CLI user interface and workspace scaffolding
- **preset generator**: Actual workspace configuration logic
- **init + terraform-backend + terraform-module generators**: Executed by preset

The CLI provides:
- Interactive prompts for better UX
- Package manager detection and setup
- Git repository initialization
- Nx Cloud integration options

## Examples

### Quick Start (Interactive)

```bash
npx create-nx-terraform-app my-infrastructure
```

You'll be guided through:
- Project name confirmation
- Backend type selection (AWS S3 or local)
- Package manager choice
- Nx Cloud setup (optional)
- Git initialization

### Non-Interactive (CI/CD)

```bash
npx create-nx-terraform-app my-workspace \
  --backendType=aws-s3 \
  --packageManager=npm \
  --nxCloud=false \
  --git=true
```

### AWS S3 Backend Setup

```bash
npx create-nx-terraform-app production-infra --backendType=aws-s3
```

Creates workspace with production-ready S3 backend for remote state management.

### Local Backend for Development

```bash
npx create-nx-terraform-app dev-workspace --backendType=local
```

Creates workspace with local state storage (good for development/testing).

## Notes

- The backend project is always named `terraform-setup` (hardcoded in preset)
- The infrastructure module is always named `terraform-infra` (hardcoded in preset)
- Both projects are created automatically by the preset generator
- Requires Nx v22.0.2 or compatible version
- The CLI automatically handles workspace name normalization (handles slashes)

## Related Documentation

- [Preset Generator Reference](/docs/reference/generators/preset) - Detailed preset generator documentation
- [Quick Start Guide](/docs/getting-started/quick-start) - Get started with your new workspace
- [Installation Guide](/docs/getting-started/installation) - Adding to existing workspaces

