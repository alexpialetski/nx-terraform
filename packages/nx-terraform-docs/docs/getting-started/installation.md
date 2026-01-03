---
sidebar_position: 1
---

# Installation

Install the `nx-terraform` plugin in your Nx workspace. The installation process differs depending on whether you're creating a new workspace or adding Terraform support to an existing one.

## For New Workspaces

The easiest way to get started is to create a new workspace with Terraform support:

```bash
npx create-nx-terraform-app my-workspace
```

This creates a fully configured workspace. For details, see the [Workspace Creation Guide](/docs/getting-started/workspace-creation) or follow [Tutorial 1](/docs/tutorials/tutorial-01-create-workspace).

## For Existing Workspaces

If you want to add Terraform support to an existing Nx workspace:

### Step 1: Install the Plugin

```bash
nx add nx-terraform
```

This command will:

- Add `nx-terraform` as a dependency to your workspace
- Register the plugin in `nx.json`
- Enable automatic Terraform project discovery

### Step 2: Initialize the Plugin

```bash
nx g nx-terraform:init
```

This registers the `nx-terraform` plugin in your workspace configuration.

### Step 3: Create Your First Backend (Optional)

If you want to use remote state storage, create a Terraform backend project:

```bash
nx g nx-terraform:terraform-backend my-backend --backendType=aws-s3
```

Or for local development:

```bash
nx g nx-terraform:terraform-backend my-backend --backendType=local
```

### Step 4: Create Your First Module

Create a Terraform module:

```bash
# Stateful module (with backend)
nx g nx-terraform:terraform-module my-infra --backendProject=my-backend

# Simple module (no backend)
nx g nx-terraform:terraform-module my-module
```

## Requirements

- **Nx**: v22.0.2 or compatible
- **Terraform**: Any version (uses Terraform CLI)
- **Node.js**: v18+ recommended

## Verification

After installation, verify the plugin is working:

```bash
# Check that the plugin is registered
nx list nx-terraform

# Check available generators
nx g nx-terraform:init --help
```

## Next Steps

- Follow the [Quick Start Guide](/docs/getting-started/quick-start) to create your first infrastructure
- Learn about [Workspace Creation](/docs/getting-started/workspace-creation) with `create-nx-terraform-app`
- Start with [Tutorial 1: Create Your First Workspace](/docs/tutorials/tutorial-01-create-workspace)

