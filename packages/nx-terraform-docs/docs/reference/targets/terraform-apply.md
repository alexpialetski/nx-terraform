---
sidebar_position: 3
---

# terraform-apply Target

Applies the Terraform configuration to create, modify, or destroy infrastructure resources.

## Usage

```bash
nx run my-project:terraform-apply

# With configuration
nx run my-project:terraform-apply --configuration=dev

# With saved plan
nx run my-project:terraform-apply -- plan.tfplan
```

## Description

The `terraform-apply` target applies your Terraform configuration to:

- Create new infrastructure resources
- Modify existing resources
- Destroy resources marked for removal

## Dependencies

- **terraform-plan**: Must run before `terraform-apply` (unless using saved plan)

## Configurations

Supports environment-specific configurations via `tfvars` files:

```bash
# Uses tfvars/dev.tfvars
nx run my-project:terraform-apply --configuration=dev

# Uses tfvars/prod.tfvars
nx run my-project:terraform-apply --configuration=prod
```

## Behavior

### Interactive Confirmation

By default, Terraform prompts for confirmation before applying:

```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes
```

The target runs with `-auto-approve` by default (no confirmation prompt). Use `--configuration=<env>` for environment-specific var files when you ran plan with the same configuration.

### Apply Saved Plan

Apply a previously saved plan:

```bash
nx run my-project:terraform-apply -- plan.tfplan
```

## Caching

- **Backend Projects**: ✅ Cached (when inputs unchanged)
- **Stateful Projects**: ❌ Not cached (state-dependent, modifies infrastructure)
- **Module Projects**: N/A (modules don't use apply)

## Examples

### Basic Apply

```bash
# Plan first
nx run my-infra:terraform-plan

# Then apply
nx run my-infra:terraform-apply
```

### Apply with Configuration

```bash
nx run my-infra:terraform-apply --configuration=prod
```

### Apply Saved Plan

The default `terraform-plan` target writes the plan to `tfplan`. Apply it with:

```bash
nx run my-infra:terraform-plan
nx run my-infra:terraform-apply
```

To use a custom plan file:

```bash
nx run my-infra:terraform-apply -- custom.tfplan
```

## Common Use Cases

- **Deploy infrastructure**: Create or update infrastructure
- **CI/CD pipelines**: Automated infrastructure deployment
- **Environment provisioning**: Set up dev, staging, prod environments
- **Infrastructure updates**: Apply configuration changes

## Related Targets

- **terraform-plan**: Should run before `terraform-apply`
- **terraform-destroy**: Destroys infrastructure (opposite operation)

## Notes

- Always review the plan before applying
- The target uses `-auto-approve` by default; gate production applies in CI with approval steps
- Apply operations modify real infrastructure
- State is updated after successful apply
- Failed applies may leave infrastructure in partial state

