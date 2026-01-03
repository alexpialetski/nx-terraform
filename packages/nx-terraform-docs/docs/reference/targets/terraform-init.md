---
sidebar_position: 1
---

# terraform-init Target

Initializes a Terraform workspace, downloading required providers and configuring the backend connection.

## Usage

```bash
nx run my-project:terraform-init
```

## Description

The `terraform-init` target initializes a Terraform workspace by:

- Downloading required provider plugins
- Configuring the backend connection
- Preparing the workspace for Terraform operations

## Dependencies

### Project Dependencies

- **Backend Projects**: No dependencies (backend projects manage their own state)
- **Stateful Projects**: Depends on `^terraform-apply` from the backend project (backend must be applied first)

### Target Dependencies

- Automatically runs `sync-terraform-metadata` generator before initialization to ensure project metadata is up to date

## Behavior

### Backend Projects

- Initializes with local or S3 backend configuration
- Downloads providers specified in `provider.tf`
- Prepares workspace for backend infrastructure deployment

### Stateful Projects

- Reads `backend.config` from the referenced backend project
- Configures backend connection using the backend project's configuration
- Downloads providers specified in `provider.tf`
- Prepares workspace for infrastructure deployment

### Module Projects

- Initializes for validation purposes (modules don't have state)
- Downloads providers for validation
- Stub operation (modules are included in other projects)

## Caching

- **Backend Projects**: ✅ Cached (backend projects don't depend on external state)
- **Stateful Projects**: ❌ Not cached (state-dependent, requires backend access)
- **Module Projects**: N/A (stub operation)

## Examples

### Initialize Backend Project

```bash
nx run terraform-setup:terraform-init
```

### Initialize Stateful Project

```bash
# Backend must be applied first
nx run terraform-setup:terraform-apply

# Then initialize infrastructure project
nx run my-infra:terraform-init
```

### Initialize with Reconfiguration

If you need to reconfigure the backend:

```bash
nx run my-infra:terraform-init -- -reconfigure
```

## Common Use Cases

- **First-time setup**: Initialize a new Terraform project
- **After provider changes**: Re-initialize when provider versions change
- **Backend changes**: Re-initialize when backend configuration changes
- **Workspace reset**: Re-initialize to reset workspace state

## Related Targets

- **terraform-plan**: Requires `terraform-init` to run first
- **terraform-apply**: Requires `terraform-init` to run first
- **terraform-validate**: Requires `terraform-init` to run first

## Notes

- The target automatically runs `sync-terraform-metadata` before initialization
- For stateful projects, the backend project must be applied before initialization
- Provider downloads are cached locally by Terraform
- Backend configuration is read from `backend.config` for stateful projects

