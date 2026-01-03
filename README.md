# nx-terraform

An [Nx](https://nx.dev) plugin for managing Terraform projects within an Nx monorepo.

## Quick Start

Create a new workspace with Terraform support:

```bash
npx create-nx-terraform-app my-workspace
```

Or add to an existing workspace:

```bash
nx add nx-terraform
nx g nx-terraform:init
```

## Documentation

📚 **[Full Documentation](https://alexpialetski.github.io/nx-terraform/)** - Complete guides, tutorials, and API reference

The documentation includes:
- Getting started guides
- Step-by-step tutorials
- Generator and target references
- Best practices and troubleshooting

## Features

- **Automatic Project Discovery** - Discovers Terraform projects automatically
- **Inferred Tasks** - Creates Terraform targets (init, plan, apply, destroy, validate, fmt, output)
- **Smart Dependencies** - Automatic dependency management between projects
- **Intelligent Caching** - Optimized caching for safe operations

## Resources

- [Documentation](https://alexpialetski.github.io/nx-terraform/)
- [GitHub Repository](https://github.com/alexpialetski/nx-terraform)
- [npm Package](https://www.npmjs.com/package/nx-terraform)
- [Nx Documentation](https://nx.dev)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)

## License

MIT
