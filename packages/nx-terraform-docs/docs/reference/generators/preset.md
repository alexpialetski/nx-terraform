---
sidebar_position: 4
---

# preset Generator

The `preset` generator provides complete workspace initialization with Terraform setup. It combines the `init` generator and creates an initial Terraform backend project, giving you a fully configured workspace ready for Terraform development.

## Usage

```bash
# When creating a new workspace
npx create-nx-terraform-app my-workspace

# Or directly (advanced usage)
nx g nx-terraform:preset --projectName=terraform-setup --backendType=aws-s3
```

## Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `projectName` | string | Yes | - | Name of the workspace (currently not used for project names, which are hardcoded). Also accepts `name` as alias. |
| `backendType` | 'aws-s3' \| 'local' | No | - | Type of Terraform backend to scaffold. If not provided, only the plugin is initialized and no backend/module projects are created. |

## Backend Types

- **aws-s3**: Creates AWS S3 remote backend for Terraform state storage
- **local**: Creates local backend using local state files

## What It Does

The preset generator performs these steps in sequence:

1. **Runs `init` generator**: Registers the `nx-terraform` plugin in `nx.json`
2. **Creates backend project** (if `backendType` is provided): Generates a Terraform backend project named `terraform-setup` (hardcoded)
3. **Creates stateful module** (if `backendType` is provided): Generates a Terraform stateful module named `terraform-infra` (hardcoded) connected to the backend project
4. **Creates simple module** (if `backendType` is not provided): Generates a simple Terraform module named `terraform-infra` (hardcoded) without backend connection

## What Gets Created

After running the preset with `backendType`:

```
workspace-root/
├── nx.json                 # Contains nx-terraform plugin registration
└── packages/
    ├── terraform-setup/    # Backend project (hardcoded name, only if backendType provided)
    │   ├── project.json
    │   ├── main.tf
    │   ├── backend.tf
    │   ├── provider.tf
    │   └── ... (other backend files)
    └── terraform-infra/    # Module (hardcoded name)
        ├── project.json    # Contains metadata['nx-terraform'].backendProject: 'terraform-setup' (if backendType provided)
        ├── main.tf
        ├── backend.tf      # References terraform-setup backend (if backendType provided)
        ├── provider.tf     # Only if backendType provided
        └── ... (other module files)
```

If `backendType` is not provided, only `terraform-infra` is created as a simple module (no backend connection).

## Examples

### Creating New Workspace with AWS S3 Backend

```bash
npx create-nx-terraform-app my-terraform-workspace

# During creation, you'll be prompted:
# - Project name: terraform-setup
# - Backend type: AWS S3 remote backend
```

### Creating New Workspace with Local Backend

```bash
npx create-nx-terraform-app my-terraform-workspace

# During creation, select:
# - Backend type: Local backend
```

### Direct Preset Usage (Advanced)

**With backend (creates backend + stateful module):**

```bash
nx g nx-terraform:preset \
  --projectName=my-workspace \
  --backendType=aws-s3
```

**Without backend (creates simple module only):**

```bash
nx g nx-terraform:preset --projectName=my-workspace
```

This creates:

- Plugin registration in `nx.json`
- Backend project at `packages/terraform-setup/` (only if `--backendType` provided)
- Module project at `packages/terraform-infra/`

## When to Use

- **Creating a new workspace** from scratch with Terraform support
- **Quick setup** for teams starting with Terraform in Nx
- **Standardized initialization** ensuring consistent workspace structure

## Related Generators

- **init**: Registers the plugin (automatically called by preset)
- **terraform-backend**: Creates the backend project (automatically called by preset)
- **terraform-module**: Creates the stateful module (automatically called by preset)

## Notes

- The backend project name is hardcoded as `'terraform-setup'` in the preset generator (only created if `backendType` is provided)
- The module name is hardcoded as `'terraform-infra'` in the preset generator
- The `projectName` option in the schema is accepted but not currently used (both project names are hardcoded)
- If `backendType` is provided, you get a fully functional Terraform workspace with both backend and stateful infrastructure module
- If `backendType` is not provided, you get a workspace with plugin registration and a simple module (no backend)

