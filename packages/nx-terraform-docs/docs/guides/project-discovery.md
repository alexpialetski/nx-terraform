---
sidebar_position: 5
---

# Project Discovery

The nx-terraform plugin automatically discovers Terraform projects in your workspace. Understanding how discovery works helps you organize your projects correctly and troubleshoot discovery issues.

## Overview

Project discovery happens automatically when Nx loads your workspace. The plugin scans for Terraform projects and creates targets for each discovered project.

## Discovery Process

### Step 1: Pattern Matching

The plugin looks for files matching:
```
**/main.tf
```

This pattern finds all `main.tf` files recursively in your workspace.

### Step 2: Project Validation

For each `main.tf` file found, the plugin checks:

1. **Project Configuration**: Does `project.json` exist in the same directory?
2. **Project Type**: What is the `projectType` in `project.json`?
3. **Metadata**: Does it have `nx-terraform` metadata?

### Step 3: Target Creation

If validation passes, the plugin creates Terraform targets:
- `terraform-init`
- `terraform-plan`
- `terraform-apply`
- `terraform-destroy`
- `terraform-validate`
- `terraform-fmt`
- `terraform-output`

## Discovery Requirements

### Required Files

For a project to be discovered:

1. **main.tf** - Must exist in the project directory
2. **project.json** - Must exist in the same directory as `main.tf`

### Project Structure

```
packages/
  └── my-terraform-project/
      ├── project.json          # Required
      ├── main.tf              # Required for discovery
      ├── backend.tf           # Optional
      ├── provider.tf          # Optional
      └── variables.tf         # Optional
```

## Project Type Detection

The plugin determines project type from `project.json`:

### Backend Project

```json
{
  "projectType": "application",
  "root": "packages/terraform-setup"
  // No backendProject in metadata
}
```

### Stateful Project

```json
{
  "projectType": "application",
  "root": "packages/my-infra",
  "metadata": {
    "nx-terraform": {
      "backendProject": "terraform-setup"
    }
  }
}
```

### Module Project

```json
{
  "projectType": "library",
  "root": "packages/networking"
  // No backendProject in metadata
}
```

## Discovery Patterns

### Standard Pattern

Most common structure:

```
packages/
  ├── terraform-setup/      # Backend project
  │   ├── project.json
  │   └── main.tf
  └── my-infra/             # Stateful project
      ├── project.json
      └── main.tf
```

### Nested Projects

Projects can be nested:

```
packages/
  └── infrastructure/
      ├── backend/
      │   ├── project.json
      │   └── main.tf
      └── frontend/
          ├── project.json
          └── main.tf
```

### Monorepo Structure

Works with any monorepo structure:

```
apps/
  └── terraform-app/
      ├── project.json
      └── main.tf

libs/
  └── terraform-lib/
      ├── project.json
      └── main.tf
```

## Verification

### Check Discovered Projects

```bash
nx show projects
```

Should list all Terraform projects.

### View Project Details

```bash
nx show project my-terraform-project
```

Shows project configuration and targets.

### View Project Graph

```bash
nx graph
```

Visual representation of all projects and dependencies.

## Troubleshooting

For project discovery issues, see the [Troubleshooting Guide](/docs/guides/troubleshooting#project-discovery-issues).

## Discovery Configuration

### Plugin Registration

The plugin must be registered in `nx.json`:

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

### Pattern Customization

The discovery pattern is hardcoded to `**/main.tf`. This cannot be customized currently.

## Best Practices

### 1. Consistent Structure

- Keep `main.tf` and `project.json` together
- Use consistent directory structure
- Follow naming conventions

### 2. Clear Naming

- Use descriptive project names
- Match directory names to project names
- Avoid special characters

### 3. Organization

- Group related projects
- Use clear directory structure
- Document project purposes

### 4. Validation

- Verify projects are discovered after creation
- Check targets are created correctly
- Test project dependencies

## Discovery Timing

### When Discovery Happens

- **Workspace Load**: When Nx loads the workspace
- **File Changes**: When files are added/modified (with Nx daemon)
- **Manual Refresh**: Using `nx reset` or restarting Nx

### Discovery Performance

- **Fast**: Pattern matching is efficient
- **Cached**: Results are cached by Nx
- **Incremental**: Only scans changed areas

## Manual Project Creation

If a project isn't discovered automatically:

1. **Create project.json:**
   ```json
   {
     "root": "packages/my-project",
     "projectType": "application"
   }
   ```

2. **Create main.tf:**
   ```hcl
   # Terraform configuration
   ```

3. **Verify discovery:**
   ```bash
   nx show projects
   ```

## Related Topics

- [Project Types](/docs/guides/project-types) - Learn about different project types
- [Installation](/docs/getting-started/installation) - Plugin installation and setup
- [Generators](/docs/reference/generators/init) - Use generators to create projects correctly

