---
sidebar_position: 2
---

# Quick Start

Get up and running with nx-terraform in 3 simple steps. For detailed explanations, see the [Tutorials](/docs/tutorials/tutorial-01-create-workspace).

## Prerequisites

- Node.js v18+ installed
- Terraform CLI installed (optional, but recommended)

## Step 1: Create Workspace

```bash
npx create-nx-terraform-app my-terraform-workspace
cd my-terraform-workspace
```

**What you should see:**
```
✔ Choose backend type › AWS S3 (or local)
✔ Choose package manager › npm
✔ Creating workspace...
✔ Installing dependencies...
✔ Initializing git repository...

Successfully created nx workspace 'my-terraform-workspace'

Next steps:
  cd my-terraform-workspace
  nx run terraform-setup:terraform-apply
```

**Verification:**
```bash
ls packages/
# terraform-setup  terraform-infra
```

Learn more: [Workspace Creation Guide](/docs/getting-started/workspace-creation)

## Step 2: Apply Backend (if using remote backend)

```bash
nx run terraform-setup:terraform-apply
```

**What you should see:**
```
> nx run terraform-setup:terraform-apply

Terraform will perform the following actions:
  # aws_s3_bucket.terraform_state will be created
  ...

Plan: 2 to add, 0 to change, 0 to destroy.

Do you want to perform these actions? yes
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.
```

**Success indicators:**
- ✅ S3 bucket created (check AWS Console)
- ✅ `backend.config` file generated in `packages/terraform-setup/`
- ✅ No errors in output

**Common issues:**
- **Error: AWS credentials not found** → Configure AWS credentials: `aws configure`
- **Error: Bucket already exists** → Choose a different bucket name in `terraform-setup/main.tf`

:::tip Local Backend
If you chose a local backend, skip this step. See [Backend Types](/docs/guides/backend-types) for details.
:::

## Step 3: Deploy Infrastructure

```bash
nx run terraform-infra:terraform-init
```

**What you should see:**
```
> nx run terraform-infra:terraform-init

Initializing the backend...
Successfully configured the backend "s3"!

Terraform has been successfully initialized!
```

**Success indicator:** ✅ Backend initialized, `.terraform/` directory created

---

```bash
nx run terraform-infra:terraform-plan
```

**What you should see:**
```
> nx run terraform-infra:terraform-plan

Terraform will perform the following actions:
  # local_file.example will be created
  ...

Plan: 1 to add, 0 to change, 0 to destroy.
```

**Success indicator:** ✅ Plan shows resources to create, no errors

---

```bash
nx run terraform-infra:terraform-apply
```

**What you should see:**
```
> nx run terraform-infra:terraform-apply

Do you want to perform these actions? yes

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

**Success indicator:** ✅ Resources created successfully

**Verify deployment:**
```bash
nx run terraform-infra:terraform-output
# Shows any outputs defined in your infrastructure
```

## What's Next?

- **Want detailed explanations?** Follow the [Tutorials](/docs/tutorials/tutorial-01-create-workspace)
- **Need help?** Check the [Troubleshooting Guide](/docs/guides/troubleshooting)
- **Ready for more?** See [Examples](/docs/examples/complete-workflow)

## Verify Everything Works

Check that Nx discovered your projects:
```bash
nx show projects
```

**Expected output:**
```
terraform-setup
terraform-infra
```

View your infrastructure dependency graph:
```bash
nx graph
```

**What you should see:** Visual graph showing `terraform-infra` → `terraform-setup` dependency

## Common Commands

```bash
nx run <project>:terraform-init    # Initialize
nx run <project>:terraform-plan    # Plan changes
nx run <project>:terraform-apply   # Apply changes
nx run <project>:terraform-validate # Validate
nx run <project>:terraform-fmt     # Format code
nx run <project>:terraform-output   # View outputs
```

For detailed command reference, see [Targets Documentation](/docs/reference/targets/terraform-init).

## Need Help?

- **Troubleshooting**: See the [Troubleshooting Guide](/docs/guides/troubleshooting)
- **Detailed Tutorials**: Follow the [Tutorial Series](/docs/tutorials/tutorial-01-create-workspace)
- **Reference**: Check [Targets](/docs/reference/targets/terraform-init) and [Generators](/docs/reference/generators/init)

