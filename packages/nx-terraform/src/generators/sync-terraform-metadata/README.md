# Sync Terraform Metadata Generator

## Overview

The `sync-terraform-metadata` generator automatically updates `project.json` metadata fields based on the current state of Terraform files in your workspace. It scans all projects, detects backend blocks in `.tf` files, and updates the `metadata['nx-terraform'].projectType` metadata accordingly.

This generator is designed to be run as a global sync generator, ensuring that project metadata stays in sync with the actual Terraform configuration files.

## Usage

```bash
# Run manually
nx g nx-terraform:sync-terraform-metadata

# Or run as part of global sync
nx sync
```

## What It Does

The generator:

1. **Scans all projects** in the workspace
2. **Identifies Terraform projects** by checking for `metadata['nx-terraform'].projectType` (must be set to 'module' or 'stateful')
3. **Detects backend blocks** by parsing all `.tf` files in each project
4. **Updates metadata** in `project.json`:
   - Sets `metadata['nx-terraform'].projectType: 'stateful'` when backend blocks are detected
   - Sets `metadata['nx-terraform'].projectType: 'module'` when no backend blocks are found
   - Only updates when the current type doesn't match the detected state (preserves explicit user intent)

## Metadata Preservation

The generator **never overwrites**:

- `metadata['nx-terraform'].projectType: 'backend'` - Explicitly set by the `terraform-backend` generator
- `metadata['nx-terraform'].backendProject` - Explicitly set by the `terraform-module` generator when creating stateful modules

This ensures that user intent is always preserved, and the generator only fills in missing metadata.

## When to Use

- **After manually creating Terraform projects** - Projects must have `metadata['nx-terraform'].projectType` set to 'module' or 'stateful' first
- **After modifying `.tf` files** to add or remove backend blocks
- **As part of CI/CD** to ensure metadata is always up to date
- **Automatically** when registered as a global sync generator (runs with `nx sync`)

**Note**: The generator only processes projects that already have `metadata['nx-terraform'].projectType` set. It does not create Terraform project metadata from scratch - use the generators (`terraform-backend`, `terraform-module`) to create new projects.

## Idempotency

The generator is idempotent - it's safe to run multiple times. It only updates metadata when:

- The project has `metadata['nx-terraform'].projectType` set to `'module'` or `'stateful'`
- The detected state (presence of backend blocks) differs from the current `projectType` metadata

## Error Handling

The generator gracefully handles:

- Projects without `metadata['nx-terraform'].projectType` (skipped - not Terraform projects)
- Projects with `projectType: 'backend'` (skipped - backend projects are not synced)
- Projects with `metadata['nx-terraform'].backendProject` set (skipped - explicit backend reference preserved)
- Projects without `.tf` files (skipped)
- Parse errors in `.tf` files (continues with next file)
- File read errors (continues with next project)

## Registration as Global Sync Generator

To automatically run this generator with `nx sync`, add it to your `nx.json`:

```json
{
  "sync": {
    "globalGenerators": ["nx-terraform:sync-terraform-metadata"]
  }
}
```

The `init` generator can optionally set this up automatically.

## Implementation Details

**Key Functions:**

- `getProjects(tree)`: Gets all projects in the workspace
- `readProjectConfiguration(tree, projectName)`: Reads current project configuration
- `updateProjectConfiguration(tree, projectName, config)`: Updates project configuration
- `hasBackendBlock(parsed)`: Detects backend blocks in parsed HCL

**Behavior:**

- **Idempotent**: Safe to run multiple times
- **Non-destructive**: Only updates missing metadata, never overwrites explicit values
- **Error-tolerant**: Continues processing even if individual projects fail

**Code Location:**

- Implementation: `packages/nx-terraform/src/generators/sync-terraform-metadata/sync-terraform-metadata.ts`
- Schema: `packages/nx-terraform/src/generators/sync-terraform-metadata/schema.json`
