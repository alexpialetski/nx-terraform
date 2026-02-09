---
sidebar_position: 2
---

# terraform-plan Target

Creates an execution plan showing what Terraform will do when you apply your configuration.

## Usage

```bash
nx run my-project:terraform-plan

# With configuration
nx run my-project:terraform-plan --configuration=dev
```

## Description

The `terraform-plan` target creates an execution plan that shows:

- Resources that will be created
- Resources that will be modified
- Resources that will be destroyed
- Resource attribute changes

## Dependencies

- **terraform-init**: Must run before `terraform-plan`

## Configurations

Supports environment-specific configurations via `args` array. Configure in your `project.json`:

```json
{
  "targets": {
    "terraform-plan": {
      "options": {
        "args": ["-var-file=tfvars/dev.tfvars"]
      },
      "configurations": {
        "prod": {
          "args": ["-var-file=tfvars/prod.tfvars"]
        }
      }
    }
  }
}
```

Paths in `-var-file` are relative to the project root (where the command runs). Then use configurations:

```bash
# Uses tfvars/dev.tfvars
nx run my-project:terraform-plan

# Uses tfvars/prod.tfvars
nx run my-project:terraform-plan --configuration=prod
```

## Behavior

### Plan Output

The plan shows:

- **+** (green): Resources to be created
- **~** (yellow): Resources to be modified
- **-** (red): Resources to be destroyed
- **-** (no change): Resources that won't change

### Plan File

The target saves the plan to `tfplan` by default. Run `terraform-apply` to apply it (no extra arguments needed).

## Caching

- **Backend Projects**: ✅ Cached (when inputs unchanged)
- **Stateful Projects**: ❌ Not cached (state-dependent, shows infrastructure changes)
- **Module Projects**: N/A (stub operation)

## Examples

### Basic Plan

```bash
nx run my-infra:terraform-plan
```

### Plan with Configuration

```bash
nx run my-infra:terraform-plan --configuration=dev
```

### Plan for Specific Resource

```bash
nx run my-infra:terraform-plan -- -target=aws_instance.example
```

## Common Use Cases

- **Preview changes**: See what will change before applying
- **CI/CD validation**: Check plans in CI before applying
- **Review changes**: Review infrastructure changes with team
- **Save plans**: Save plans for later application

## Related Targets

- **terraform-init**: Must run before `terraform-plan`
- **terraform-apply**: Uses the plan to apply changes

## Notes

- Plans are state-dependent and cannot be cached for stateful projects
- Plans can be saved and applied later
- Plans show detailed change information
- Use `-refresh=false` to skip state refresh if needed
