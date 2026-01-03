---
sidebar_position: 2
---

# Tutorial 2: Set Up a Backend

In this tutorial, you'll learn how to set up and apply a Terraform backend. The backend manages where Terraform stores its state files, which is crucial for team collaboration and state management.

## What You'll Learn

- How to understand backend configuration
- How to apply a backend project
- The difference between local and remote backends
- How backend.config files work

## Prerequisites

- Completed [Tutorial 1: Create Your First Workspace](/docs/tutorials/tutorial-01-create-workspace)
- Basic understanding of Terraform state

## Understanding Backends

A Terraform backend determines where state is stored. The nx-terraform plugin supports two backend types: **Local** and **AWS S3**.

:::info
For a comprehensive comparison of backend types, see the [Backend Types Guide](/docs/guides/backend-types).
:::

## Step 1: Examine the Backend Configuration

Navigate to the backend project:

```bash
cd packages/terraform-setup
```

### View Backend Configuration

```bash
cat backend.tf
```

For a **local backend**, you'll see:

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

For an **AWS S3 backend**, you'll see:

```hcl
terraform {
  backend "s3" {
    # Configuration will be provided via backend.config
  }
}
```

The S3 backend uses a `backend.config` file that gets generated after the first apply.

### View Main Configuration

```bash
cat main.tf
```

For a **local backend**, `main.tf` is typically minimal or empty since no infrastructure is needed.

For an **AWS S3 backend**, `main.tf` contains the infrastructure to create:
- S3 bucket for state storage
- DynamoDB table for state locking (optional but recommended)

## Step 2: Plan the Backend (Optional)

Before applying, you can see what Terraform will create:

```bash
nx run terraform-setup:terraform-plan
```

For a local backend, this will show minimal changes (or no changes if already initialized).

For an AWS S3 backend, this will show:
- S3 bucket creation
- DynamoDB table creation (if configured)
- Bucket versioning and encryption settings

## Step 3: Apply the Backend

Apply the backend to create the state storage infrastructure:

```bash
nx run terraform-setup:terraform-apply
```

### For Local Backend

The apply will:
- Initialize Terraform (if not already done)
- Create a local `terraform.tfstate` file
- Complete quickly with minimal output

### For AWS S3 Backend

The apply will:
- Create the S3 bucket
- Create the DynamoDB table (if configured)
- Enable versioning and encryption
- Generate `backend.config` file with bucket details

You'll be prompted to confirm. Type `yes` to proceed.

## Step 4: Verify Backend Configuration

### Check State File (Local Backend)

```bash
ls -la terraform.tfstate
```

You should see the state file created.

### Check Backend Config (AWS S3 Backend)

```bash
cat backend.config
```

You'll see something like:

```hcl
bucket = "my-terraform-workspace-terraform-setup-abc123"
key    = "terraform-setup/terraform.tfstate"
region = "us-east-1"
dynamodb_table = "terraform-setup-lock"
```

This file is used by other projects to connect to the same backend.

## Step 5: Understand Backend Project Behavior

### Backend Projects Are Special

Backend projects have unique characteristics:

1. **Self-contained state**: They manage their own state (even if using remote backend, the backend project itself uses local state initially)
2. **Generate backend.config**: After applying, they generate configuration files for other projects
3. **No backend dependency**: They don't depend on another backend project

### View Project Details

```bash
nx show project terraform-setup
```

Notice:
- No `backendProject` in metadata (it's a backend itself)
- All Terraform targets are available
- Caching is enabled for safe operations

## Step 6: Test Backend Operations

### Validate Configuration

```bash
nx run terraform-setup:terraform-validate
```

This validates your Terraform configuration without making changes.

### Format Code

```bash
nx run terraform-setup:terraform-fmt
```

This formats your Terraform files according to standard conventions.

### View Outputs (if any)

```bash
nx run terraform-setup:terraform-output
```

Backend projects typically output:
- Bucket name (for S3 backends)
- Region
- DynamoDB table name (if used)

## Understanding Backend.config

The `backend.config` file is crucial for connecting infrastructure projects to the backend:

### How It Works

1. Backend project applies and creates infrastructure
2. Backend project generates `backend.config` with connection details
3. Infrastructure projects read `backend.config` to connect to the backend
4. This ensures all projects use the same state storage

### File Location

The `backend.config` file is in the backend project directory:
```
packages/terraform-setup/backend.config
```

Infrastructure projects reference this file via their `backend.tf`:

```hcl
terraform {
  backend "s3" {
    config_file = "../../terraform-setup/backend.config"
  }
}
```

## Troubleshooting

If you encounter issues setting up your backend, see the [Troubleshooting Guide](/docs/guides/troubleshooting) for common problems and solutions.

## Next Steps

Now that your backend is set up:

- **Tutorial 3**: Learn how to [Create Your First Infrastructure Module](/docs/tutorials/tutorial-03-first-module) and connect it to this backend
- **Guides**: Read about [Backend Types](/docs/guides/backend-types) for more details on backend options

## Summary

In this tutorial, you:

1. ✅ Examined backend configuration
2. ✅ Applied a backend project (local or AWS S3)
3. ✅ Verified backend setup
4. ✅ Understood how `backend.config` works
5. ✅ Learned about backend project characteristics

Your backend is now ready to support infrastructure projects!

