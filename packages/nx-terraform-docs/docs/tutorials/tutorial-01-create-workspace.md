---
sidebar_position: 1
---

# Tutorial 1: Create Your First Workspace

In this tutorial, you'll create your first Nx workspace with Terraform support using `create-nx-terraform-app`. This is the foundation for all subsequent tutorials.

## What You'll Learn

- How to create a new Nx workspace with Terraform support
- Understanding the generated project structure
- What gets created and why

## Prerequisites

- Node.js v18+ installed
- npm, yarn, or pnpm installed
- Basic familiarity with command line

## Step 1: Create the Workspace

Run the `create-nx-terraform-app` command:

```bash
npx create-nx-terraform-app my-terraform-workspace
```

You'll be prompted with several questions:

### Project Name

The command will ask you to confirm the project name. Press Enter to accept `my-terraform-workspace` or type a different name.

### Backend Type

Choose your Terraform backend type. For this tutorial, choose `local` to keep things simple.

:::info
Learn more about backend types in the [Backend Types Guide](/docs/guides/backend-types).
:::

### Package Manager

Select your preferred package manager:

- **npm**: Default Node.js package manager
- **yarn**: Fast, reliable package manager
- **pnpm**: Efficient disk space usage

### Nx Cloud (Optional)

You can connect to Nx Cloud for distributed caching. For this tutorial, you can skip this (choose `No`).

### Git Initialization

The workspace will initialize a git repository by default. This is recommended.

## Step 2: Explore the Generated Structure

After the workspace is created, navigate into it:

```bash
cd my-terraform-workspace
```

Let's examine what was created:

### Root Files

```bash
ls -la
```

You should see:
- `nx.json` - Nx workspace configuration
- `package.json` - Node.js dependencies
- `.gitignore` - Git ignore patterns
- `packages/` - Directory containing your Terraform projects

### Terraform Projects

```bash
ls packages/
```

You should see two projects:

1. **terraform-setup** - Backend project for state management
2. **terraform-infra** - Your first infrastructure module

### Examine the Backend Project

```bash
cd packages/terraform-setup
ls -la
```

You'll see:
- `project.json` - Nx project configuration
- `main.tf` - Main Terraform configuration
- `backend.tf` - Backend configuration
- `provider.tf` - Provider requirements
- `variables.tf` - Input variables

### Examine the Infrastructure Module

```bash
cd ../terraform-infra
ls -la
```

You'll see similar files, plus:
- `outputs.tf` - Output values

## Step 3: Understand the Project Configuration

Let's look at the project configuration files:

### Backend Project (`terraform-setup/project.json`)

```bash
cat packages/terraform-setup/project.json
```

Key points:
- `projectType: "application"` - This is an application project
- No `backendProject` metadata - This indicates it's a backend project itself
- Contains Terraform targets (init, plan, apply, etc.)

### Infrastructure Module (`terraform-infra/project.json`)

```bash
cat packages/terraform-infra/project.json
```

Key points:
- `projectType: "application"` - This is also an application project
- `metadata['nx-terraform'].backendProject: "terraform-setup"` - This connects it to the backend
- Contains the same Terraform targets

## Step 4: Verify Nx Can See Your Projects

Check that Nx has discovered your Terraform projects:

```bash
nx show projects
```

You should see:
- `terraform-setup`
- `terraform-infra`

View the project graph:

```bash
nx graph
```

This opens a visual representation of your project dependencies. You should see `terraform-infra` depending on `terraform-setup`.

## Step 5: Check Available Targets

See what targets are available for each project:

```bash
nx show project terraform-setup
```

You'll see targets like:
- `terraform-init`
- `terraform-plan`
- `terraform-apply`
- `terraform-validate`
- `terraform-fmt`
- `terraform-destroy`
- `terraform-output`

## Understanding What Was Created

### Backend Project (`terraform-setup`)

Manages Terraform state storage infrastructure. See [Project Types Guide](/docs/guides/project-types#backend-projects) for details.

### Infrastructure Module (`terraform-infra`)

Your first infrastructure project connected to the backend. See [Project Types Guide](/docs/guides/project-types#stateful-projects) for details.

## Key Concepts

- **Project Discovery**: Projects are automatically discovered. Learn more in the [Project Discovery Guide](/docs/guides/project-discovery).
- **Automatic Dependencies**: Dependencies are created automatically. See the [Dependencies Guide](/docs/guides/dependencies) for details.

## Next Steps

Now that you have a workspace set up:

- **Tutorial 2**: Learn how to [Set Up a Backend](/docs/tutorials/tutorial-02-setup-backend) and apply it
- **Tutorial 3**: Create and deploy your [First Infrastructure Module](/docs/tutorials/tutorial-03-first-module)

## Summary

In this tutorial, you:

1. ✅ Created a new Nx workspace with Terraform support
2. ✅ Explored the generated project structure
3. ✅ Understood the difference between backend and infrastructure projects
4. ✅ Verified Nx can see and manage your Terraform projects

Your workspace is now ready for the next steps!

