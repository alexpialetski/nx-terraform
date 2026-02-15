---
sidebar_position: 2
---

# terraform-backend Generator

The `terraform-backend` generator creates a Terraform backend project that manages remote state infrastructure. Backend projects are responsible for provisioning and maintaining the infrastructure needed for Terraform state storage (e.g., S3 buckets for AWS or local state files).

## Usage

```bash
# Create AWS S3 backend
nx g nx-terraform:terraform-backend my-backend --backendType=aws-s3

# Create local backend
nx g nx-terraform:terraform-backend my-backend --backendType=local

# Create AWS S3 backend with custom bucket prefix
nx g nx-terraform:terraform-backend my-backend \
  --backendType=aws-s3 \
  --bucketNamePrefix=myteam-terraform
```

## Options

| Option             | Type                | Required | Default           | Description                                                                                      |
| ------------------ | ------------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `name`             | string              | Yes      | -                 | Name of the backend project (positional argument)                                                |
| `backendType`      | 'aws-s3' \| 'local' | Yes      | -                 | Type of Terraform backend to generate                                                            |
| `bucketNamePrefix` | string              | No       | 'terraform-state' | Prefix for S3 bucket name (AWS S3 only). Must be 3-31 characters, alphanumeric with dots/hyphens |

## Backend Types

### AWS S3 Backend

- Provisions S3 bucket for remote Terraform state storage
- Generates `backend.config` with bucket name, key, and region
- Supports versioning and object lock for state protection
- Bucket naming: `{bucketNamePrefix}-{account-id}-{region}`
- Uses a **state sync script** before plan: if the bucket already exists in AWS but is not in state, the script imports it (and versioning/object lock) then runs `terraform plan`; otherwise the plugin would try to create the bucket. This "import if exists" approach avoids conditional resource creation.

### Local Backend

- Sets up local state file storage
- Generates `backend.config` with local path configuration
- Suitable for development or single-user scenarios

## What It Creates

The generator creates a complete Terraform backend project. Structure depends on `backendType`:

**Common (all backends):**

```
packages/{name}/
├── project.json              # Nx project configuration (type: application)
├── main.tf                   # Backend infrastructure definitions
├── backend.tf                # Backend configuration
├── provider.tf               # Provider requirements and configuration
├── variables.tf               # Input variables (AWS S3) or absent (local)
├── locals.tf                 # Local values (backend-specific logic)
├── backend.config            # Generated backend config (output file)
├── .gitignore                # Terraform ignore patterns
└── README.md                 # Backend-specific documentation
```

**AWS S3 only:**

```
packages/{name}/
├── s3.tf                     # S3 bucket, versioning, object lock resources
└── scripts/
    └── sync_backend_state.sh # State sync before plan (see below)
```

### Project Configuration

- **projectType**: `'application'`
- **metadata['nx-terraform'].projectType**: `'backend'`
- **metadata['nx-terraform'].backendType**: `'aws-s3'` or `'local'`
- **root**: `packages/{name}`
- **targets**: Empty (targets are inferred by the plugin)

## State sync before plan (AWS S3)

For **aws-s3** backends, the **terraform-plan** target runs `scripts/sync_backend_state.sh` instead of `terraform plan -out=tfplan` directly. The script:

1. Resolves the bucket name (same as Terraform: `{bucketNamePrefix}-{account_id}-{region}`).
2. Checks whether the bucket exists in AWS and whether the current state already tracks it.
3. If the bucket exists but state does not track it, runs `terraform import` for the bucket, versioning, and object lock configuration.
4. Runs `terraform plan -out=tfplan`.

**Required environment variables** when running terraform-plan for an AWS S3 backend:

- `TF_VAR_account_id` – AWS account ID (must match the account in use).
- `TF_VAR_region` – AWS region (must match the region in use).

These ensure the script’s bucket name matches what Terraform computes from data sources. You may need to run `chmod +x scripts/sync_backend_state.sh` once after generating the project.

## Examples

### Basic AWS S3 Backend

```bash
nx g nx-terraform:terraform-backend production-backend --backendType=aws-s3
```

Creates backend project that provisions S3 bucket for state storage.

### Custom Bucket Prefix

```bash
nx g nx-terraform:terraform-backend my-backend \
  --backendType=aws-s3 \
  --bucketNamePrefix=myorg-terraform
```

Creates S3 bucket with name like: `myorg-terraform-123456789-us-east-1`

### Local Backend for Development

```bash
nx g nx-terraform:terraform-backend dev-backend --backendType=local
```

Creates simple local backend using local state files.

### Workflow Example

```bash
# 1. Initialize plugin
nx g nx-terraform:init

# 2. Create backend
nx g nx-terraform:terraform-backend shared-backend --backendType=aws-s3

# 3. Apply backend (provisions infrastructure)
nx run shared-backend:terraform-apply

# 4. Backend.config is now available for other projects
# Other projects can reference this backend via targets['terraform-init'].backendProject
```

## Backend Configuration File

The generator creates a `backend.config` file that contains:

**AWS S3:**

```hcl
bucket = "{bucket-name}"
key    = "tf_state"
region = "{aws-region}"
```

**Local:**

```hcl
path = "{local-path}"
```

This file is referenced by stateful Terraform modules using:

```bash
terraform init -backend-config=../{backend-project}/backend.config
```

## Integration with Other Projects

Backend projects are referenced by stateful Terraform modules via the **terraform-init target options** in their `project.json`:

```json
{
  "targets": {
    "terraform-init": {
      "backendProject": "shared-backend"
    }
  }
}
```

This allows stateful modules to automatically use the backend configuration during `terraform-init`.

## When to Use

- **Setting up state management** infrastructure for your Terraform projects
- **Centralized state storage** for teams and CI/CD pipelines
- **Production infrastructure** requiring remote state with locking
- **Development setup** with local state (local backend)
- **Multi-project workspaces** where multiple projects share the same backend

## Related Generators

- **init**: Registers the plugin (run before creating backends)
- **terraform-module**: Creates modules that can reference this backend via `backendProject` option
- **preset**: Automatically creates a backend project as part of workspace setup

## Notes

- Backend projects have `projectType: 'application'` with `metadata['nx-terraform'].projectType: 'backend'`
- Backend projects do not set `terraform-init.metadata.backendProject` (they are the backend, not consumers of it)
- The plugin automatically infers Terraform targets for backend projects
- Backend projects must be applied before stateful projects can use them
- The `backend.config` file is generated as part of the backend project's Terraform output
