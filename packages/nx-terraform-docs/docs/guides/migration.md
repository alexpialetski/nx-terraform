---
sidebar_position: 11
---

# Migration Guide

Learn how to migrate existing Terraform setups to nx-terraform.

## Overview

This guide helps you migrate from various Terraform setups into an nx-terraform workspace. The migration process typically involves:

1. Setting up an Nx workspace with nx-terraform
2. Moving Terraform code into the workspace
3. Configuring project metadata
4. Updating module references
5. Verifying dependencies
6. Testing the migration

## From Standalone Terraform

Migrating from a standalone Terraform setup (no monorepo) to nx-terraform.

### Scenario

You have Terraform code structured like:

```
my-infrastructure/
├── modules/
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── compute/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
├── backend/
│   └── main.tf
└── README.md
```

### Migration Steps

#### 1. Create Nx Workspace

```bash
# Option A: Create new workspace
npx create-nx-workspace my-infrastructure-nx --preset=empty
cd my-infrastructure-nx
nx add nx-terraform
nx g nx-terraform:init

# Option B: Use create-nx-terraform-app (skip backend in wizard, we'll migrate yours)
npx create-nx-terraform-app my-infrastructure-nx
cd my-infrastructure-nx
```

#### 2. Migrate Backend Project

```bash
# Create backend project structure
nx g nx-terraform:terraform-backend terraform-setup --type=aws-s3

# Copy your backend configuration
cp ../my-infrastructure/backend/* packages/terraform-setup/

# Update project.json metadata
# Ensure it has: "metadata": { "nx-terraform": { "projectType": "backend" } }
```

#### 3. Migrate Reusable Modules

```bash
# For each module in modules/
nx g nx-terraform:terraform-module networking --type=module
nx g nx-terraform:terraform-module compute --type=module

# Copy module code
cp -r ../my-infrastructure/modules/networking/* packages/networking/
cp -r ../my-infrastructure/modules/compute/* packages/compute/
```

#### 4. Migrate Environment-Specific Infrastructure

```bash
# For each environment
nx g nx-terraform:terraform-module dev-infra --backendProject=terraform-setup
nx g nx-terraform:terraform-module prod-infra --backendProject=terraform-setup

# Copy environment code
cp -r ../my-infrastructure/environments/dev/* packages/dev-infra/
cp -r ../my-infrastructure/environments/prod/* packages/prod-infra/
```

#### 5. Update Module Source Paths

Update module references to use relative paths:

**Before (in `environments/dev/main.tf`):**
```hcl
module "networking" {
  source = "../../modules/networking"
  # ...
}
```

**After (in `packages/dev-infra/main.tf`):**
```hcl
module "networking" {
  source = "../networking"  # Relative to packages/
  # ...
}
```

#### 6. Verify Dependencies

```bash
# Check Nx detected dependencies correctly
nx graph

# Should show:
# dev-infra → terraform-setup (backend)
# dev-infra → networking (module)
# prod-infra → terraform-setup (backend)
# prod-infra → compute (module)
```

#### 7. Test Migration

```bash
# Validate all projects
nx run-many --target=terraform-validate --all

# Format code
nx run-many --target=terraform-fmt --all

# Test init on one environment
nx run dev-infra:terraform-init

# Test plan
nx run dev-infra:terraform-plan
```

### Migration Checklist

- ✅ Backend project created and tested
- ✅ All modules migrated to `packages/`
- ✅ All environments migrated to `packages/`
- ✅ Module source paths updated to relative paths
- ✅ Backend references configured in environment projects
- ✅ Dependencies show correctly in `nx graph`
- ✅ All projects validate successfully
- ✅ State backend connects properly
- ✅ Plans run successfully

---

## From Terragrunt

Migrating from Terragrunt to nx-terraform.

### Key Differences

| Terragrunt | nx-terraform |
|------------|--------------|
| `terragrunt.hcl` files | `project.json` files |
| `dependency` blocks | Automatic detection from `module` blocks |
| Remote state config in `terragrunt.hcl` | Backend projects with `backend.config` |
| `include` for DRY config | Module projects for reusable code |
| `run-all` command | `nx run-many` or `nx affected` |

### Migration Strategy

#### 1. Analyze Current Setup

Identify:
- Root `terragrunt.hcl` (becomes backend project)
- Reusable modules (become module projects)
- Environment-specific configs (become stateful projects)
- Dependencies between projects

#### 2. Create Nx Workspace

```bash
npx create-nx-terraform-app my-infrastructure
cd my-infrastructure
```

#### 3. Migrate Root Configuration

**Terragrunt root `terragrunt.hcl`:**
```hcl
remote_state {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

**nx-terraform equivalent:**
```bash
# Create backend project
nx g nx-terraform:terraform-backend terraform-setup --type=aws-s3

# Edit packages/terraform-setup/main.tf
# Configure S3 bucket with same settings
```

#### 4. Migrate Modules

**Terragrunt module:**
```
modules/
└── vpc/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── terragrunt.hcl  # Include parent config
```

**nx-terraform module:**
```bash
nx g nx-terraform:terraform-module vpc --type=module
# Copy .tf files (skip terragrunt.hcl)
cp modules/vpc/*.tf packages/vpc/
```

#### 5. Migrate Environment Configurations

**Terragrunt environment:**
```
environments/
└── dev/
    ├── vpc/
    │   └── terragrunt.hcl  # Includes root, sets inputs
    └── compute/
        └── terragrunt.hcl
```

**nx-terraform environment:**
```bash
# Create stateful project per component
nx g nx-terraform:terraform-module dev-vpc --backendProject=terraform-setup
nx g nx-terraform:terraform-module dev-compute --backendProject=terraform-setup

# Create main.tf that uses modules
# packages/dev-vpc/main.tf
module "vpc" {
  source = "../vpc"
  # Input variables from terragrunt.hcl go here
  cidr_block = "10.0.0.0/16"
}
```

#### 6. Replace Terragrunt Dependencies

**Terragrunt dependency:**
```hcl
dependency "vpc" {
  config_path = "../vpc"
}

inputs = {
  vpc_id = dependency.vpc.outputs.vpc_id
}
```

**nx-terraform equivalent:**

Nx detects dependencies automatically from module sources. For data dependencies:

```hcl
# Use data sources or module outputs
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "dev-vpc/terraform.tfstate"
    region = "us-east-1"
  }
}

# Or better: keep related resources in same project
```

#### 7. Replace run-all Commands

**Terragrunt:**
```bash
terragrunt run-all plan
terragrunt run-all apply --terragrunt-non-interactive
```

**nx-terraform:**
```bash
nx run-many --target=terraform-plan --all
nx run-many --target=terraform-apply --all
# Or only affected:
nx affected --target=terraform-plan
```

### Migration Checklist

- ✅ Root configuration converted to backend project
- ✅ All modules migrated
- ✅ All environments migrated
- ✅ Dependencies work without `dependency` blocks
- ✅ Remote state configuration matches
- ✅ Input variables properly set
- ✅ Test with `terraform plan`

---

## From Multi-Repo Setup

Migrating from multiple separate Terraform repositories into one nx-terraform monorepo.

### Scenario

You have:
```
terraform-backend/     (Repo 1)
terraform-networking/  (Repo 2)
terraform-app-dev/     (Repo 3)
terraform-app-prod/    (Repo 4)
```

### Migration Strategy

#### 1. Create Monorepo

```bash
npx create-nx-terraform-app infrastructure-monorepo
cd infrastructure-monorepo
```

#### 2. Migrate Each Repository

```bash
# For each repository:
git clone <repo-url> ../temp-repo
nx g nx-terraform:terraform-module <project-name> --type=<backend|module|stateful>
cp -r ../temp-repo/* packages/<project-name>/
rm -rf ../temp-repo
```

#### 3. Update Cross-Repo References

If repos referenced each other via remote state:

**Before (separate repos):**
```hcl
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
  }
}
```

**After (monorepo - option 1: keep data sources):**
```hcl
# Keep remote state references (works but less optimal)
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
  }
}
```

**After (monorepo - option 2: use modules):**
```hcl
# Better: use module references
module "networking" {
  source = "../networking"
  # ...
}

# Access outputs directly
vpc_id = module.networking.vpc_id
```

#### 4. Consolidate State

Decide on state strategy:
- **Option A:** Keep separate state files (safer, less disruption)
- **Option B:** Merge state files (cleaner, more complex)

**Option A (Recommended):**
- Keep existing state files as-is
- Each project keeps its own state key
- No migration of resources needed

**Option B (Advanced):**
```bash
# Pull state from old location
terraform state pull > old-state.json

# Import into new location
# (Complex, requires careful planning)
```

### Benefits After Migration

- ✅ Unified dependency graph
- ✅ Atomic commits across infrastructure
- ✅ Simplified CI/CD (one repo)
- ✅ Better code sharing
- ✅ Nx caching speeds up operations

---

## From Nx Workspace (Adding Terraform)

Adding Terraform to an existing Nx workspace with applications.

### Scenario

You have an Nx workspace with apps/libraries, now adding infrastructure:

```
my-nx-workspace/
├── apps/
│   ├── web-app/
│   └── api/
├── libs/
│   └── shared-utils/
└── nx.json
```

### Migration Steps

#### 1. Add nx-terraform

```bash
nx add nx-terraform
nx g nx-terraform:init
```

#### 2. Create Infrastructure Projects

```bash
# Backend for state
nx g nx-terraform:terraform-backend terraform-setup

# Infrastructure for each app
nx g nx-terraform:terraform-module web-app-infra --backendProject=terraform-setup
nx g nx-terraform:terraform-module api-infra --backendProject=terraform-setup

# Shared infrastructure modules
nx g nx-terraform:terraform-module networking --type=module
```

#### 3. Create Implicit Dependencies

Link infrastructure to applications in `project.json`:

```json
// apps/web-app/project.json
{
  "name": "web-app",
  "implicitDependencies": ["web-app-infra"]
}
```

#### 4. Co-locate Configuration

Store infrastructure variables with applications:

```
apps/
└── web-app/
    ├── src/
    ├── project.json
    └── infrastructure/
        ├── dev.tfvars
        └── prod.tfvars
```

Reference in Terraform commands:
```bash
nx run web-app-infra:terraform-apply -- -var-file=../../apps/web-app/infrastructure/dev.tfvars
```

### Benefits

- Infrastructure and application code versioned together
- Deploy infrastructure and app in same pipeline
- See full dependency graph including infrastructure
- Generate infrastructure alongside applications

---

## Common Migration Challenges

### Challenge 1: State File Conflicts

**Problem:** Existing state files reference old paths.

**Solution:**
- Keep state file structure the same
- Use `terraform state mv` to rename resources if needed
- Test thoroughly before migrating production

### Challenge 2: Module Path Changes

**Problem:** Module sources need updating.

**Solution:**
```bash
# Find all module sources
grep -r "source = " packages/

# Update to relative paths
# Old: source = "../../modules/networking"
# New: source = "../networking"
```

### Challenge 3: Variable Files

**Problem:** Variable files in different locations.

**Solution:**
```bash
# Centralize tfvars
mkdir -p packages/my-project/tfvars
mv *.tfvars packages/my-project/tfvars/

# Reference in commands
nx run my-project:terraform-apply -- -var-file=tfvars/prod.tfvars
```

### Challenge 4: CI/CD Updates

**Problem:** CI/CD pipelines need updating for monorepo.

**Solution:**
- Use `nx affected` to only build changed projects
- Update paths in CI/CD scripts
- See [CI/CD Integration Guide](/docs/guides/ci-cd)

---

## Verification Steps

After any migration:

### 1. Validate Structure

```bash
# All projects discovered
nx show projects

# Dependencies correct
nx graph

# All projects in packages/
ls packages/
```

### 2. Validate Terraform

```bash
# All projects validate
nx run-many --target=terraform-validate --all

# Format check
nx run-many --target=terraform-fmt --all -- -check
```

### 3. Test State Backend

```bash
# Init connects to backend
nx run my-project:terraform-init

# Plan works
nx run my-project:terraform-plan

# Check state file location
# Should be in expected S3 location or local path
```

### 4. Verify Outputs

```bash
# Outputs accessible
nx run my-project:terraform-output

# Compare with pre-migration outputs
# Should match exactly
```

---

## Rollback Plan

Have a rollback plan before migrating production:

1. **Backup state files**
   ```bash
   aws s3 cp s3://my-bucket/terraform.tfstate ./backup/
   ```

2. **Keep old setup accessible**
   - Don't delete old repositories immediately
   - Keep for 30 days after successful migration

3. **Document rollback procedure**
   - How to restore state files
   - How to revert module references
   - Emergency contacts

4. **Test rollback**
   - Practice rollback in dev/staging first
   - Ensure team knows the process

---

## Best Practices

1. **Migrate incrementally**
   - Start with non-production environments
   - Migrate one component at a time
   - Verify each step before proceeding

2. **Test thoroughly**
   - Run plans before and after migration
   - Compare outputs
   - Verify dependencies

3. **Document changes**
   - Update team documentation
   - Document new workflow
   - Update runbooks

4. **Train the team**
   - Show how to use Nx commands
   - Explain new project structure
   - Share troubleshooting tips

5. **Monitor carefully**
   - Watch for unexpected changes in plans
   - Monitor state file integrity
   - Check dependency graph regularly

---

## Getting Help

If you encounter issues during migration:

- 📖 [Troubleshooting Guide](/docs/guides/troubleshooting)
- 💬 [GitHub Discussions](https://github.com/alexpialetski/nx-terraform/discussions)
- 🐛 [Report Issues](https://github.com/alexpialetski/nx-terraform/issues)

## Related Topics

- [Project Types](/docs/guides/project-types) - Understanding project types
- [Dependencies](/docs/guides/dependencies) - How dependencies work
- [CI/CD Integration](/docs/guides/ci-cd) - Setting up CI/CD
- [Best Practices](/docs/guides/best-practices) - Recommended patterns
