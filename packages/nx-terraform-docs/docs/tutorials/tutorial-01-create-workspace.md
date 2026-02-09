---
sidebar_position: 1
---

# Tutorial 1: Create a Workspace and Run

Create an Nx workspace with Terraform support and run your first plan and apply. This is the foundation for the rest of the tutorials.

## What You'll Do

- Create a workspace with `create-nx-terraform-app`
- Apply the backend (state storage)
- Run plan and apply on the default infrastructure project

## Prerequisites

- Node.js v18+
- npm, yarn, or pnpm

## Step 1: Create the Workspace

```bash
npx create-nx-terraform-app my-terraform-workspace
cd my-terraform-workspace
```

When prompted:

- **Project name**: Accept default or choose another.
- **Backend type**: Choose `local` for this tutorial (no cloud setup).
- **Package manager**: Your preference (npm, yarn, pnpm).
- **Nx Cloud**: Skip for now (choose `No`).

You get two Terraform projects: `terraform-setup` (backend) and `terraform-infra` (infrastructure). The [Project Types](/docs/guides/project-types) guide explains backend vs stateful projects.

## Step 2: Apply the Backend

The backend project provides where Terraform state is stored. Apply it first:

```bash
nx run terraform-setup:terraform-apply
```

For a local backend this is quick (local state file). For AWS S3 it would create the bucket and generate `backend.config`. See [Backend Types](/docs/guides/backend-types) for options.

## Step 3: Run Infrastructure

The preset already created `terraform-infra` and wired it to the backend. Initialize, plan, and apply:

```bash
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan
nx run terraform-infra:terraform-apply
```

Init uses the backend from `terraform-setup` (Nx runs the backend’s apply first when needed). Plan shows what would change; apply creates the resources.

## Step 4: Verify

```bash
nx show projects
# terraform-setup, terraform-infra

nx graph
# Shows terraform-infra → terraform-setup
```

## Summary

You created a workspace, applied the backend, and ran plan/apply on the default infrastructure project. Next: [Tutorial 2: Add a reusable module](/docs/tutorials/tutorial-02-setup-backend).
