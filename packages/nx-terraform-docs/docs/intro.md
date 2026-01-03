---
sidebar_position: 1
---

# Introduction

**nx-terraform** is an [Nx](https://nx.dev) plugin for managing Terraform projects within an Nx monorepo. This plugin provides generators, automatic project discovery, and inferred tasks for Terraform infrastructure-as-code projects.

## What is nx-terraform?

The `nx-terraform` plugin enables you to manage Terraform projects alongside your other code in an Nx monorepo. It bridges the gap between infrastructure-as-code and application code, allowing you to:

- **Discover Terraform projects automatically** - No manual configuration needed
- **Use Nx commands** - Run Terraform operations through familiar Nx targets
- **Manage dependencies** - Automatic dependency detection between Terraform projects
- **Leverage Nx caching** - Speed up your infrastructure workflows with intelligent caching
- **Maintain consistency** - Keep all your code, including infrastructure, in one monorepo

## Key Features

### Automatic Project Discovery

The plugin automatically discovers Terraform projects by looking for `main.tf` files in your workspace. Learn more in the [Project Discovery Guide](/docs/guides/project-discovery).

### Inferred Tasks

The plugin automatically creates these targets for each Terraform project:

- **terraform-init**: Initialize Terraform workspace
- **terraform-plan**: Create execution plan
- **terraform-apply**: Apply changes to infrastructure
- **terraform-destroy**: Destroy infrastructure
- **terraform-validate**: Validate Terraform configuration
- **terraform-fmt**: Format Terraform code
- **terraform-output**: Show Terraform outputs

### Smart Dependencies

Automatic dependency management between Terraform projects ensures proper execution order:

- **Backend Dependencies**: Projects with backends automatically depend on their backend project
- **Module References**: Module references in Terraform code are automatically detected and create project dependencies
- **Target Dependencies**: Targets have their own dependencies (e.g., init before plan, plan before apply)

### Intelligent Caching

Intelligent caching speeds up safe operations while ensuring state-dependent operations always run. Learn more in the [Caching Guide](/docs/guides/caching).

## Use Cases

### Monorepo Infrastructure Management

Manage all your infrastructure code alongside your application code in a single Nx monorepo. This provides:

- **Unified versioning** - Infrastructure and application code in the same repository
- **Shared dependencies** - Infrastructure modules can be shared across projects
- **Consistent tooling** - Use the same Nx commands for everything
- **Better visibility** - See infrastructure dependencies in the Nx graph

### Multi-Environment Deployments

Easily manage multiple environments (dev, staging, prod) with:

- **Environment-specific modules** - Separate projects for each environment
- **Configuration files** - Use `tfvars` files for environment-specific variables
- **Dependency management** - Ensure proper deployment order across environments

### Reusable Infrastructure Modules

Create reusable Terraform modules that can be shared across projects:

- **Library modules** - Reusable Terraform code without state
- **Automatic dependencies** - Module references create automatic project dependencies
- **Version control** - Track module versions alongside consuming projects

## Project Types

The plugin supports three types of Terraform projects: **Backend Projects**, **Stateful Projects**, and **Module Projects**. Learn more about [Project Types](/docs/guides/project-types).

## Choose Your Path

### Quick Start (5 minutes)
Want to get running fast? Follow the [Quick Start Guide](/docs/getting-started/quick-start) for a minimal setup.

### Step-by-Step Tutorials (30-60 minutes)
Prefer detailed explanations? Follow the [Tutorial Series](/docs/tutorials/tutorial-01-create-workspace) from workspace creation to advanced patterns.

### Reference Documentation
Need specific information? Check the [Reference Documentation](/docs/reference/generators/init) for generators and targets.

### For Existing Workspaces
Adding Terraform to an existing Nx workspace? Start with [Installation](/docs/getting-started/installation).

## Resources

- [Nx Documentation](https://nx.dev)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [GitHub Repository](https://github.com/alexpialetski/nx-terraform)
- [npm Package](https://www.npmjs.com/package/nx-terraform)

## License

MIT
