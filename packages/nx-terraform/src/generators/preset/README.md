# Preset Generator

## Overview

The `preset` generator provides complete workspace initialization with Terraform setup. It combines the `init` generator and creates an initial Terraform backend project, giving you a fully configured workspace ready for Terraform development. This generator is primarily used when creating a new workspace via `npx create-nx-terraform-app`.

## Usage

```bash
# When creating a new workspace
npx create-nx-terraform-app my-workspace

# Or directly (advanced usage)
nx g @nx-terraform/plugin:preset --projectName=terraform-setup --backendType=aws-s3
```

## Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `projectName` | string | Yes | - | Name of the workspace (currently not used for project names, which are hardcoded). Also accepts `name` as alias. |
| `backendType` | 'aws-s3' \| 'local' | Yes | - | Type of Terraform backend to scaffold (used for both backend and module projects). |

### Backend Types

- **aws-s3**: Creates AWS S3 remote backend for Terraform state storage
- **local**: Creates local backend using local state files

## What It Does

The preset generator performs these steps in sequence:

1. **Runs `init` generator**: Registers the `nx-terraform` plugin in `nx.json`
2. **Creates backend project**: Generates a Terraform backend project named `terraform-setup` (hardcoded)
3. **Creates stateful module**: Generates a Terraform stateful module named `terraform-infra` (hardcoded) connected to the backend project
4. **Configures backend type**: Sets up the backend infrastructure based on your chosen `backendType`

## Implementation Details

**Generator Composition:**
- Calls `initGenerator(tree)` to register the plugin
- Calls `terraformBackendGenerator(tree, {...})` with:
  - `name: 'terraform-setup'` (hardcoded in preset)
  - `backendType`: From options
- Calls `terraformModuleGenerator(tree, {...})` with:
  - `name: 'terraform-infra'` (hardcoded in preset)
  - `backendProject: 'terraform-setup'` (hardcoded reference to backend)
  - `backendType`: From options

**Code Structure:**
```typescript
// 1. Register plugin
await initGenerator(tree);

// 2. Create backend project
await terraformBackendGenerator(tree, {
  name: 'terraform-setup',
  backendType: options.backendType,
});

// 3. Create stateful module connected to backend
await terraformModuleGenerator(tree, {
  name: 'terraform-infra',
  backendProject: 'terraform-setup',
  backendType: options.backendType,
});
```

**Code Location:**
- Implementation: `packages/nx-terraform/src/generators/preset/generator.ts`
- Schema: `packages/nx-terraform/src/generators/preset/schema.json`

**Dependencies:**
- Uses `init` generator internally
- Uses `terraform-backend` generator internally
- Uses `terraform-module` generator internally

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

```bash
nx g @nx-terraform/plugin:preset \
  --projectName=my-backend \
  --backendType=aws-s3
```

This creates:
- Plugin registration in `nx.json`
- Backend project at `packages/my-backend/`

## When to Use

- **Creating a new workspace** from scratch with Terraform support
- **Quick setup** for teams starting with Terraform in Nx
- **Standardized initialization** ensuring consistent workspace structure

## What Gets Created

After running the preset:

```
workspace-root/
├── nx.json                 # Contains nx-terraform plugin registration
└── packages/
    ├── terraform-setup/    # Backend project (hardcoded name)
    │   ├── project.json
    │   ├── main.tf
    │   ├── backend.tf
    │   ├── provider.tf
    │   └── ... (other backend files)
    └── terraform-infra/    # Stateful module (hardcoded name)
        ├── project.json    # Contains metadata.backendProject: 'terraform-setup'
        ├── main.tf
        ├── backend.tf      # References terraform-setup backend
        ├── provider.tf
        └── ... (other module files)
```

## Related Generators

- **init**: Registers the plugin (automatically called by preset)
- **terraform-backend**: Creates the backend project (automatically called by preset)
- **terraform-module**: Creates the stateful module (automatically called by preset)

## Notes

- The backend project name is hardcoded as `'terraform-setup'` in the preset generator
- The stateful module name is hardcoded as `'terraform-infra'` in the preset generator
- The `projectName` option in the schema is accepted but not currently used (both project names are hardcoded)
- The preset uses `x-use-standalone-layout: true`, making it suitable for workspace creation workflows
- After preset runs, you have a fully functional Terraform workspace with both backend and infrastructure module ready for development

