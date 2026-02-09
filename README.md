<div align="center">

# nx-terraform

### Manage Terraform infrastructure in your Nx monorepo

[![npm version](https://img.shields.io/npm/v/nx-terraform.svg)](https://www.npmjs.com/package/nx-terraform)
[![npm downloads](https://img.shields.io/npm/dm/nx-terraform.svg)](https://www.npmjs.com/package/nx-terraform)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://alexpialetski.github.io/nx-terraform/) • [Quick Start](#quick-start) • [Examples](#examples)

</div>

---

## Why nx-terraform?

Managing infrastructure-as-code alongside application code is challenging. **nx-terraform** bridges this gap by bringing Terraform projects into your Nx monorepo with:

- **Zero Configuration** - Automatically discovers Terraform projects, no manual setup needed
- **Smart Dependencies** - Understands relationships between your infrastructure modules
- **Intelligent Caching** - Speeds up operations without compromising safety
- **Unified Workflow** - Use familiar Nx commands for all infrastructure operations
- **Type-Safe Integration** - Keep infrastructure and application code in sync

### The Problem

Traditional Terraform setups struggle with:
- Manual dependency tracking between modules
- Slow, repetitive operations without caching
- Infrastructure isolated from application code
- Complex multi-environment management
- No visibility into infrastructure dependencies

### The Solution

```bash
# Create workspace with Terraform support
npx create-nx-terraform-app my-infrastructure

# Nx automatically discovers projects and manages dependencies
nx graph  # See your infrastructure dependency graph

# Run operations with intelligent caching
nx run web-infra:terraform-plan   # Fast when inputs haven't changed
nx run web-infra:terraform-apply  # Full control when needed
```

## Quick Start

### New Workspace

```bash
npx create-nx-terraform-app my-workspace
cd my-workspace

# Apply backend (if using remote state)
nx run terraform-setup:terraform-apply

# Deploy your infrastructure
nx run terraform-infra:terraform-init
nx run terraform-infra:terraform-plan
nx run terraform-infra:terraform-apply
```

### Existing Workspace

```bash
# Add nx-terraform to your workspace
nx add nx-terraform
nx g nx-terraform:init

# Create your first Terraform project
nx g nx-terraform:terraform-backend terraform-setup
nx g nx-terraform:terraform-module web-infra --backendProject=terraform-setup
```

## Key Features

### 🔍 Automatic Project Discovery
No manual configuration. Drop a `main.tf` file in your workspace and nx-terraform finds it.

```bash
nx show projects  # All Terraform projects automatically discovered
```

### 🎯 Inferred Terraform Targets
Seven Terraform operations automatically available for each project:

```bash
nx run <project>:terraform-init      # Initialize workspace
nx run <project>:terraform-plan      # Create execution plan
nx run <project>:terraform-apply     # Apply changes
nx run <project>:terraform-destroy   # Destroy infrastructure
nx run <project>:terraform-validate  # Validate configuration
nx run <project>:terraform-fmt       # Format code
nx run <project>:terraform-output    # Show outputs
```

### 🔗 Smart Dependency Management
Automatically detects and manages two types of dependencies:

**Backend Dependencies** - Projects reference their state backend
```json
{
  "targets": {
    "terraform-init": {
      "metadata": {
        "backendProject": "terraform-setup"
      }
    }
  }
}
```

**Module Dependencies** - Terraform code references are detected automatically
```hcl
module "networking" {
  source = "../networking"  # Automatic dependency on networking project
}
```

### ⚡ Intelligent Caching
Operations are cached when safe, always run fresh when state-dependent:

- ✅ **Cached**: `terraform-fmt`, `terraform-validate` (fast when unchanged)
- 🔄 **Always Fresh**: `terraform-plan`, `terraform-apply` (state-dependent)

### 📦 Three Project Types

**Backend Projects** - Manage state storage infrastructure
```bash
nx g nx-terraform:terraform-backend terraform-setup --type=aws-s3
```

**Stateful Projects** - Deploy actual infrastructure with remote state
```bash
nx g nx-terraform:terraform-module web-infra --backendProject=terraform-setup
```

**Module Projects** - Reusable Terraform code without state
```bash
nx g nx-terraform:terraform-module networking --type=module
```

## Examples

### Multi-Environment Setup

```bash
# Shared backend
nx g nx-terraform:terraform-backend terraform-setup

# Environment-specific infrastructure
nx g nx-terraform:terraform-module dev-infra --backendProject=terraform-setup
nx g nx-terraform:terraform-module prod-infra --backendProject=terraform-setup

# Deploy with environment-specific variables
nx run dev-infra:terraform-apply -- -var-file=tfvars/dev.tfvars
nx run prod-infra:terraform-apply -- -var-file=tfvars/prod.tfvars
```

### Reusable Modules

```bash
# Create reusable networking module
nx g nx-terraform:terraform-module networking --type=module

# Use in your infrastructure
nx g nx-terraform:terraform-module web-infra --backendProject=terraform-setup
```

In `web-infra/main.tf`:
```hcl
module "networking" {
  source = "../networking"
  vpc_cidr = "10.0.0.0/16"
}
```

Nx automatically detects this dependency: `web-infra` → `networking`

## Documentation

📚 **[Full Documentation](https://alexpialetski.github.io/nx-terraform/)**

- [Getting Started Guide](https://alexpialetski.github.io/nx-terraform/docs/getting-started/quick-start)
- [Step-by-Step Tutorials](https://alexpialetski.github.io/nx-terraform/docs/tutorials/tutorial-01-create-workspace)
- [Guides](https://alexpialetski.github.io/nx-terraform/docs/guides/project-types) - Project types, dependencies, caching, best practices
- [Reference](https://alexpialetski.github.io/nx-terraform/docs/reference/generators/init) - Generators and targets
- [Examples](https://alexpialetski.github.io/nx-terraform/docs/examples/complete-workflow) - Real-world patterns

## Who Is This For?

**Perfect for:**
- Teams managing infrastructure in monorepos
- Organizations with multiple environments (dev/staging/prod)
- Projects with shared infrastructure modules
- Teams wanting infrastructure visibility in their dependency graph

**Not ideal for:**
- Single-file Terraform projects (use Terraform CLI directly)
- Teams not using Nx (requires Nx workspace)

## Requirements

- Node.js 18+
- Nx workspace (or create new with `create-nx-terraform-app`)
- Terraform CLI (optional but recommended)

## Support

- 📖 [Documentation](https://alexpialetski.github.io/nx-terraform/)
- 🐛 [Report Issues](https://github.com/alexpialetski/nx-terraform/issues)
- 💬 [GitHub Discussions](https://github.com/alexpialetski/nx-terraform/discussions)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Resources

- [Nx Documentation](https://nx.dev)
- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [GitHub Repository](https://github.com/alexpialetski/nx-terraform)
- [npm Package](https://www.npmjs.com/package/nx-terraform)

## License

MIT
