# nx-terraform

An [Nx](https://nx.dev) plugin for managing Terraform projects within an Nx monorepo.

## Quick Start

The easiest way to get started is to create a new workspace with Terraform support:

```bash
npx create-nx-terraform-app my-workspace
```

This will:
- Create a new Nx workspace
- Install and configure the `nx-terraform` plugin
- Set up an initial Terraform backend project (`terraform-setup`)
- Create an initial Terraform infrastructure module (`terraform-infra`) connected to the backend
- Guide you through backend type selection (AWS S3 or local)

## For Existing Workspaces

If you want to add Terraform support to an existing Nx workspace:

```bash
# Install the plugin
nx add nx-terraform

# Initialize the plugin
nx g @nx-terraform/plugin:init

# Create a Terraform backend
nx g @nx-terraform/plugin:terraform-backend my-backend --backendType=aws-s3
```

## What's Next?

- **Apply your backend** (if using remote backend):
  ```bash
  nx run my-backend:terraform-apply
  ```

- **Create infrastructure modules**:
  ```bash
  nx g @nx-terraform/plugin:terraform-module my-infra \
    --backendProject=my-backend \
    --backendType=aws-s3
  ```

- **Use Terraform targets**:
  ```bash
  nx run my-infra:terraform-plan
  nx run my-infra:terraform-apply
  ```

## Documentation

Comprehensive documentation is available:

- **[Plugin Documentation](./packages/nx-terraform/README.md)** - Complete guide to the nx-terraform plugin, including features, generators, targets, and examples
- **[Workspace Creation](./packages/create-nx-terraform-app/README.md)** - Detailed guide to creating workspaces with `create-nx-terraform-app`
- **Generator Documentation**:
  - [Init Generator](./packages/nx-terraform/src/generators/init/README.md) - Plugin initialization
  - [Terraform Backend Generator](./packages/nx-terraform/src/generators/terraform-backend/README.md) - Backend project creation
  - [Terraform Module Generator](./packages/nx-terraform/src/generators/terraform-module/README.md) - Module creation
  - [Preset Generator](./packages/nx-terraform/src/generators/preset/README.md) - Workspace preset

## Features

- **Automatic Project Discovery**: Automatically discovers Terraform projects based on `main.tf` files
- **Inferred Tasks**: Automatically creates Terraform targets (init, plan, apply, destroy, validate, fmt, output)
- **Generators**: Scaffold Terraform backend projects and modules
- **Smart Dependencies**: Automatic dependency management between Terraform projects
- **Caching**: Intelligent caching for safe operations (fmt, validate)

## Resources

- [Nx Documentation](https://nx.dev)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [GitHub Repository](https://github.com/alexpialetski/nx-terraform)

## License

MIT
