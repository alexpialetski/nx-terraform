---
sidebar_position: 3
---

# Tutorial 3: Create Your First Infrastructure Module

In this tutorial, you'll create and deploy your first infrastructure module. You'll learn how to connect it to a backend, initialize it, plan changes, and apply infrastructure.

## What You'll Learn

- How to create a stateful Terraform module
- How to connect a module to a backend
- How to initialize, plan, and apply infrastructure
- How project dependencies work
- How to view outputs

## Prerequisites

- Completed [Tutorial 1: Create Your First Workspace](/docs/tutorials/tutorial-01-create-workspace)
- Completed [Tutorial 2: Set Up a Backend](/docs/tutorials/tutorial-02-setup-backend)
- Backend project applied (if using remote backend)

## Step 1: Understand the Existing Module

The workspace creation already created `terraform-infra`. Let's examine it:

```bash
cd packages/terraform-infra
```

### View Project Configuration

```bash
cat project.json
```

Notice:
- `projectType: "application"` - This is a stateful project
- `metadata['nx-terraform'].backendProject: "terraform-setup"` - Connected to backend
- Contains all Terraform targets

### View Backend Configuration

```bash
cat backend.tf
```

You'll see how it connects to the backend:

```hcl
terraform {
  backend "s3" {
    config_file = "../../terraform-setup/backend.config"
  }
}
```

Or for local backend:

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### View Main Configuration

```bash
cat main.tf
```

This contains your infrastructure definition. The default is minimal - you can add your own resources.

## Step 2: Create a New Module (Optional)

If you want to create an additional module instead of using the default one:

```bash
# From workspace root
nx g nx-terraform:terraform-module my-infrastructure --backendProject=terraform-setup
```

This creates a new stateful module connected to your backend.

For this tutorial, we'll use the existing `terraform-infra` module.

## Step 3: Customize Your Infrastructure

Let's add a simple resource to `main.tf`. Edit the file:

```bash
# Edit packages/terraform-infra/main.tf
```

Add a simple example (this creates a local file for demonstration):

```hcl
resource "local_file" "example" {
  content  = "Hello from nx-terraform!"
  filename = "${path.module}/output.txt"
}
```

:::note
This example uses the `local` provider. For real infrastructure, you'd use providers like `aws`, `azurerm`, `google`, etc.
:::

### Update Provider Configuration

If you added a resource that requires a provider, ensure it's in `provider.tf`:

```bash
cat provider.tf
```

For the local provider example, add:

```hcl
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}
```

## Step 4: Initialize the Module

Before you can use the module, initialize it:

```bash
nx run terraform-infra:terraform-init
```

This command:
- Downloads required providers
- Configures the backend connection
- Prepares the workspace

### Understanding Dependencies

Notice that `terraform-init` automatically depends on the backend:

```bash
nx show project terraform-infra --json | jq '.targets["terraform-init"].dependsOn'
```

You'll see it depends on `^terraform-apply` from the backend project. This ensures the backend is applied before initialization.

## Step 5: Validate Configuration

Before planning, validate your configuration:

```bash
nx run terraform-infra:terraform-validate
```

This checks for syntax errors and configuration issues without making changes.

## Step 6: Format Your Code

Format your Terraform files:

```bash
nx run terraform-infra:terraform-fmt
```

This ensures consistent formatting across all `.tf` files.

## Step 7: Plan Your Changes

Create an execution plan:

```bash
nx run terraform-infra:terraform-plan
```

This shows:
- What resources will be created
- What resources will be modified
- What resources will be destroyed

Review the plan carefully before applying.

### Understanding the Plan Output

The plan shows:
- **+** (green): Resources to be created
- **~** (yellow): Resources to be modified
- **-** (red): Resources to be destroyed
- **-** (no change): Resources that won't change

## Step 8: Apply Your Infrastructure

Apply the changes to create your infrastructure:

```bash
nx run terraform-infra:terraform-apply
```

Terraform will:
1. Show the plan again
2. Ask for confirmation (type `yes`)
3. Create/modify/destroy resources
4. Update the state file

### Watch the Output

You'll see real-time output as Terraform creates resources:
- Resource creation progress
- Any errors or warnings
- Final summary

## Step 9: Verify Your Infrastructure

### Check State

```bash
nx run terraform-infra:terraform-output
```

This shows any outputs defined in `outputs.tf`.

### Verify Resources

For the local file example:
```bash
cat packages/terraform-infra/output.txt
```

You should see: "Hello from nx-terraform!"

For real infrastructure (AWS, Azure, etc.), verify resources in their respective consoles.

## Step 10: Understand Project Dependencies

View the dependency graph:

```bash
nx graph
```

You should see:
- `terraform-infra` depends on `terraform-setup`
- This ensures proper execution order

### How Dependencies Work

1. **Backend Dependency**: `terraform-infra` depends on `terraform-setup` because of the `backendProject` metadata
2. **Target Dependencies**: `terraform-init` depends on `^terraform-apply` (backend must be applied first)
3. **Operation Dependencies**: `terraform-plan` depends on `terraform-init` (must initialize first)

## Step 11: Make Changes

Let's modify the infrastructure:

```bash
# Edit packages/terraform-infra/main.tf
```

Change the content:

```hcl
resource "local_file" "example" {
  content  = "Hello from nx-terraform - Updated!"
  filename = "${path.module}/output.txt"
}
```

### Plan the Changes

```bash
nx run terraform-infra:terraform-plan
```

You'll see the resource marked for modification (`~`).

### Apply the Changes

```bash
nx run terraform-infra:terraform-apply
```

Terraform will update the resource.

## Step 12: Use Environment Configurations

Terraform projects support environment-specific variables via `tfvars` files.

### Create tfvars Directory

```bash
mkdir -p packages/terraform-infra/tfvars
```

### Create Dev Configuration

```bash
# packages/terraform-infra/tfvars/dev.tfvars
environment = "dev"
instance_count = 1
```

### Create Prod Configuration

```bash
# packages/terraform-infra/tfvars/prod.tfvars
environment = "prod"
instance_count = 3
```

### Use Configurations

```bash
# Plan with dev configuration
nx run terraform-infra:terraform-plan --configuration=dev

# Apply with prod configuration
nx run terraform-infra:terraform-apply --configuration=prod
```

## Common Operations

### View State

```bash
nx run terraform-infra:terraform-output
```

### Destroy Infrastructure

```bash
nx run terraform-infra:terraform-destroy
```

:::warning
This will destroy all resources managed by this module. Use with caution!
:::

### Refresh State

If you manually changed resources outside Terraform:

```bash
nx run terraform-infra:terraform-plan -refresh-only
```

## Next Steps

Now that you've created and deployed your first module:

- **Tutorial 4**: Learn about [Working with Multiple Environments](/docs/tutorials/tutorial-04-multiple-environments)
- **Tutorial 5**: Discover [Reusable Modules and Dependencies](/docs/tutorials/tutorial-05-reusable-modules)
- **Guides**: Read about [Project Types](/docs/guides/project-types) and [Dependencies](/docs/guides/dependencies)

## Summary

In this tutorial, you:

1. ✅ Examined an existing infrastructure module
2. ✅ Customized infrastructure configuration
3. ✅ Initialized a Terraform module
4. ✅ Planned and applied infrastructure changes
5. ✅ Verified infrastructure creation
6. ✅ Understood project and target dependencies
7. ✅ Learned about environment configurations

You now know how to create and manage infrastructure modules with nx-terraform!

