---
sidebar_position: 4
---

# terraform-destroy Target

Destroys all infrastructure resources managed by the Terraform configuration.

## Usage

```bash
nx run my-project:terraform-destroy

# With configuration
nx run my-project:terraform-destroy --configuration=dev
```

## Description

The `terraform-destroy` target destroys all infrastructure resources managed by Terraform:

- Removes all created resources
- Cleans up infrastructure
- Updates state to reflect destruction

## Dependencies

- **terraform-init**: Must run before `terraform-destroy`

## Configurations

Supports environment-specific configurations via `tfvars` files:

```bash
# Uses tfvars/dev.tfvars
nx run my-project:terraform-destroy --configuration=dev
```

## Behavior

### Interactive Confirmation

By default, Terraform prompts for confirmation before destroying:

```
Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure.
  This action cannot be undone.

  Enter a value: yes
```

### Auto-approve

To skip confirmation:

```bash
nx run my-project:terraform-destroy -- -auto-approve
```

### Targeted Destruction

Destroy specific resources:

```bash
nx run my-project:terraform-destroy -- -target=aws_instance.example
```

## Caching

- **All Projects**: ❌ Not cached (destructive operation)

## Examples

### Basic Destroy

```bash
nx run my-infra:terraform-destroy
```

### Destroy with Configuration

```bash
nx run my-infra:terraform-destroy --configuration=dev
```

### Auto-approve

```bash
nx run my-infra:terraform-destroy -- -auto-approve
```

### Targeted Destroy

```bash
nx run my-infra:terraform-destroy -- -target=aws_instance.example
```

## Common Use Cases

- **Environment cleanup**: Remove dev/test environments
- **Resource cleanup**: Remove unused infrastructure
- **Disaster recovery**: Clean up after issues
- **Cost optimization**: Remove unnecessary resources

## Related Targets

- **terraform-init**: Must run before `terraform-destroy`
- **terraform-apply**: Creates infrastructure (opposite operation)

## Warnings

:::warning
Destroy operations are **irreversible**. Always:
- Review what will be destroyed
- Backup important data
- Use with caution in production
- Consider targeted destruction for specific resources
:::

## Notes

- Destroy operations cannot be undone
- Always review the destroy plan before confirming
- Use `-target` to destroy specific resources
- State is updated after successful destroy
- Failed destroys may leave infrastructure in partial state

