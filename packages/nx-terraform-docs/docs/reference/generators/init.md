---
sidebar_position: 1
---

# init Generator

The `init` generator adds the `nx-terraform` plugin to your Nx workspace configuration. This is the first step required when adding Terraform support to an existing Nx workspace.

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

## Behavior

- **Idempotent**: Safely re-runnable - checks if plugin already exists before adding
- **Non-destructive**: Only adds plugin entry, doesn't modify existing configuration
- **No file generation**: Only modifies `nx.json`

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

### Configuring Target Arguments

You can override target arguments in individual `project.json` files using `options.args` and `configurations`. See the [Configuration guide](/docs/guides/configuration) for examples of using `args` with `-var-file` for different environments.

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
- The plugin registration enables automatic discovery of Terraform projects: the plugin scans `**/project.json` and creates Terraform targets for projects that have `metadata['nx-terraform'].projectType` set (use the generators to create projects with this metadata)

