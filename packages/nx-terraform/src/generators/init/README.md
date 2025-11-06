# Init Generator

## Overview

The `init` generator adds the `nx-terraform` plugin to your Nx workspace configuration. This is the first step required when adding Terraform support to an existing Nx workspace. It registers the plugin in `nx.json`, enabling automatic discovery of Terraform projects and inferred task generation.

## Usage

```bash
nx g nx-terraform:init
```

## Options

This generator has no options or parameters. It simply registers the plugin in your workspace configuration.

## What It Does

- Reads the current `nx.json` configuration
- Checks if the `nx-terraform` plugin is already registered
- Adds the plugin to `nx.json.plugins` array if not present:
  ```json
  {
    "plugin": "nx-terraform",
    "options": {}
  }
  ```
- Formats modified files

## Implementation Details

**Key Functions:**
- `readNxJson(tree)`: Reads current workspace configuration
- `updateNxJson(tree, nxJson)`: Updates nx.json with plugin registration
- `formatFiles(tree)`: Formats generated files

**Behavior:**
- **Idempotent**: Safely re-runnable - checks if plugin already exists before adding
- **Non-destructive**: Only adds plugin entry, doesn't modify existing configuration
- No file generation: Only modifies `nx.json`

**Code Location:**
- Implementation: `packages/nx-terraform/src/generators/init/init.ts`
- Schema: `packages/nx-terraform/src/generators/init/schema.json`

## Examples

### Adding Terraform Support to Existing Workspace

```bash
# Add nx-terraform plugin to workspace
nx g nx-terraform:init

# Now you can create Terraform projects
nx g nx-terraform:terraform-backend my-backend --backendType=local
```

### Verifying Plugin Registration

After running the generator, check `nx.json`:

```json
{
  "plugins": [
    {
      "plugin": "nx-terraform",
      "options": {}
    }
  ]
}
```

## When to Use

- **Adding Terraform support** to an existing Nx workspace
- **Manual setup** when you don't want to use the preset generator
- **Incremental adoption** of Terraform in a workspace that already has other projects

## Related Generators

- **preset**: Automatically runs `init` as part of complete workspace setup
- **terraform-backend**: Creates backend projects (requires init to be run first)
- **terraform-module**: Creates module projects (requires init to be run first)

## Notes

- This generator is automatically invoked by the `preset` generator
- The plugin registration enables automatic discovery of Terraform projects via `**/main.tf` pattern
- Once registered, the plugin will automatically create Terraform targets for discovered projects

