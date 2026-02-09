---
sidebar_position: 5
---

# sync-terraform-metadata Generator

The `sync-terraform-metadata` generator automatically updates `project.json` metadata fields based on the current state of Terraform files in your workspace. It scans all projects, detects backend blocks in `.tf` files, and updates the `metadata['nx-terraform'].projectType` metadata accordingly.

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
5. **Updates provider.tf files** (if present):
   - Detects module references from all `.tf` files in the project
   - Updates the metadata comment in `provider.tf` with the list of referenced modules
   - Ensures the metadata comment reflects the current module dependencies

## Metadata Preservation

The generator **never overwrites**:

- `metadata['nx-terraform'].projectType: 'backend'` - Explicitly set by the `terraform-backend` generator
- Target metadata (e.g. `terraform-init.metadata.backendProject`) - Set by the `terraform-module` generator or by users for stateful modules

This ensures that user intent is always preserved, and the generator only updates `projectType` in metadata based on backend block detection.

## When to Use

- **Automatically** when running `terraform-init` target - The generator is automatically invoked before initialization to ensure metadata is up to date
- **After manually creating Terraform projects** - Projects must have `metadata['nx-terraform'].projectType` set to 'module' or 'stateful' first
- **After modifying `.tf` files** to add or remove backend blocks
- **As part of CI/CD** to ensure metadata is always up to date
- **Automatically** when registered as a global sync generator (runs with `nx sync`)

**Note**: The generator only processes projects that already have `metadata['nx-terraform'].projectType` set. It does not create Terraform project metadata from scratch - use the generators (`terraform-backend`, `terraform-module`) to create new projects.

## Idempotency

The generator is idempotent - it's safe to run multiple times. It only updates metadata when:

- The project has `metadata['nx-terraform'].projectType` set to `'module'` or `'stateful'`
- The detected state (presence of backend blocks) differs from the current `projectType` metadata

## Registration as Global Sync Generator

To automatically run this generator with `nx sync`, add it to your `nx.json`:

```json
{
  "sync": {
    "globalGenerators": ["nx-terraform:sync-terraform-metadata"]
  }
}
```

The `init` generator can optionally set this up automatically. Additionally, the `terraform-init` target automatically runs this generator before initialization to ensure project metadata is synchronized.

## Error Handling

The generator gracefully handles:

- Projects without `metadata['nx-terraform'].projectType` (skipped - not Terraform projects)
- Projects with `projectType: 'backend'` (skipped - backend projects are not synced)
- Projects without `.tf` files (skipped)
- Parse errors in `.tf` files (continues with next file)
- File read errors (continues with next project)

## Notes

- The generator is designed to be run as a global sync generator
- It's automatically invoked by the `terraform-init` target before initialization
- It preserves explicit user intent and only fills in missing metadata
- It updates both project metadata and provider.tf file metadata comments

