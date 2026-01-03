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

Learn more: [Workspace Creation Guide](/docs/getting-started/workspace-creation)

## Step 2: Apply Backend (if using remote backend)

```bash
nx run terraform-setup:terraform-apply
```

:::tip Local Backend
If you chose a local backend, skip this step. See [Backend Types](/docs/guides/backend-types) for details.
:::

## Step 3: Deploy Infrastructure

```bash
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan
nx run terraform-infra:terraform-apply
```

## What's Next?

- **Want detailed explanations?** Follow the [Tutorials](/docs/tutorials/tutorial-01-create-workspace)
- **Need help?** Check the [Troubleshooting Guide](/docs/guides/troubleshooting)
- **Ready for more?** See [Examples](/docs/examples/complete-workflow)

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

