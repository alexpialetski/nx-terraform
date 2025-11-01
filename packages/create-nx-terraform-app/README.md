# create-nx-terraform-app

A CLI tool for creating new Nx workspaces pre-configured with Terraform support. This package provides an interactive setup experience that creates a fully functional Nx workspace with the `nx-terraform` plugin and an initial Terraform backend project.

## Overview

`create-nx-terraform-app` is an executable npm package that scaffolds a new Nx workspace with Terraform infrastructure-as-code capabilities. It guides users through an interactive setup process to configure their workspace with appropriate Terraform backend type and project settings.

## Installation & Usage

### Creating a New Workspace

```bash
# Create a new Terraform workspace
npx create-nx-terraform-app my-terraform-workspace

# With options (non-interactive)
npx create-nx-terraform-app my-workspace --backendType=aws-s3 --packageManager=npm
```

### Interactive Prompts

When run without all options, the CLI will prompt for:

1. **Project name**: Name of your workspace/project
2. **Terraform backend type**: Choose between:
   - `aws-s3`: AWS S3 remote backend (production-ready, supports state locking)
   - `local`: Local backend (development, state files stored locally)
3. **Package manager**: npm, yarn, or pnpm
4. **Nx Cloud**: Option to connect to Nx Cloud for distributed caching
5. **Git options**: Initialize git repository, set default branch

## Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `[name]` or `projectName` | string | Workspace/project name | - |
| `--backendType` | 'aws-s3' \| 'local' | Terraform backend type | Prompted |
| `--packageManager` | 'npm' \| 'yarn' \| 'pnpm' | Package manager to use | Prompted |
| `--nxCloud` | boolean | Connect to Nx Cloud | Prompted |
| `--git` | boolean | Initialize git repository | true |
| `--defaultBase` | string | Default git branch | 'main' |

## What It Creates

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
        ├── project.json      # Contains metadata.backendProject: 'terraform-setup'
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

## Implementation Details

### Architecture

The CLI tool is built using:
- **`create-nx-workspace`**: Core workspace creation functionality from Nx
- **`yargs`**: Command-line argument parsing
- **`enquirer`**: Interactive prompts
- **`picocolors`**: Terminal output formatting

### Workflow

1. **Argument Parsing**: Uses yargs to parse CLI arguments
2. **Interactive Prompts**: Prompts for missing required options
3. **Workspace Creation**: Calls `createWorkspace` with preset `nx-terraform@<version>`
4. **Preset Execution**: The preset generator runs:
   - Registers `nx-terraform` plugin (via `init` generator)
   - Creates backend project `terraform-setup` (via `terraform-backend` generator)
   - Creates stateful module `terraform-infra` (via `terraform-module` generator)

### Code Structure

**Main Entry Point:**
- `bin/index.ts`: Executable script (`#!/usr/bin/env node`)
- `package.json`: Defines binary as `create-nx-terraform-app`

**Key Functions:**
- `determineProjectName()`: Prompts for or validates project name
- `determineBackendType()`: Prompts for backend type selection
- `normalizeArgsMiddleware()`: Prepares arguments for workspace creation
- `main()`: Orchestrates workspace creation process

**Preset Integration:**
- Calls `createWorkspace` with preset: `nx-terraform@<version>`
- Preset is resolved to `packages/nx-terraform/src/generators/preset/generator`
- Preset generator handles plugin registration and backend project creation

### Normalization

The CLI normalizes arguments:
- Handles project names with slashes (extracts folder name)
- Merges prompted values with provided arguments
- Ensures all required options are present before workspace creation

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

## Next Steps After Creation

Once your workspace is created:

1. **Apply Backend** (if using remote backend):
   ```bash
   cd my-terraform-workspace
   nx run terraform-setup:terraform-apply
   ```

2. **Initialize and Deploy Infrastructure Module** (already created):
   ```bash
   nx run terraform-infra:terraform-init
   nx run terraform-infra:terraform-plan --configuration=dev
   nx run terraform-infra:terraform-apply --configuration=dev
   ```

3. **Create Additional Modules** (optional):
   ```bash
   # Simple module (library)
   nx g @nx-terraform/plugin:terraform-module my-module --backendType=local
   
   # Stateful module (application)
   nx g @nx-terraform/plugin:terraform-module my-infra \
     --backendProject=terraform-setup \
     --backendType=aws-s3
   ```

4. **Start Developing**:
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

## Related Packages

- **@nx-terraform/plugin**: The main plugin package containing generators and targets
- **create-nx-workspace**: Core Nx workspace creation functionality

## Development

### Building the Package

```bash
nx build create-nx-terraform-app
```

### Testing

```bash
nx test create-nx-terraform-app
```

### Publishing

The package is published to npm and can be used globally or via `npx`:

```bash
# Published as: create-nx-terraform-app
npm publish
```

## Troubleshooting

### Common Issues

**Issue**: Workspace creation fails
- Ensure you have Node.js and npm/yarn/pnpm installed
- Check network connectivity (needs to download dependencies)
- Verify disk space for new workspace

**Issue**: Backend project not created
- Check that preset generator executed successfully
- Verify `nx.json` contains `nx-terraform` plugin entry
- Check `packages/terraform-setup/` directory exists

**Issue**: Permission errors
- On Unix systems, may need to use `npx` instead of global install
- Check write permissions in target directory

## Notes

- The backend project is always named `terraform-setup` (hardcoded in preset)
- The infrastructure module is always named `terraform-infra` (hardcoded in preset)
- Both projects are created automatically by the preset generator
- Requires Nx v22.0.2 or compatible version
- Uses CommonJS module system
- Package version matches the main plugin version for consistency
- The CLI automatically handles workspace name normalization (handles slashes)
