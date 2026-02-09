---
sidebar_position: 9
---

# Frequently Asked Questions (FAQ)

Common questions and answers about nx-terraform.

## General Questions

### What is nx-terraform?

nx-terraform is an Nx plugin that brings Terraform infrastructure-as-code projects into your Nx monorepo with automatic project discovery, dependency management, and intelligent caching.

### Why use nx-terraform instead of plain Terraform?

**Use nx-terraform when:**
- Managing infrastructure in a monorepo alongside application code
- Working with multiple related Terraform modules
- Need automatic dependency detection between modules
- Want intelligent caching for faster operations
- Managing multiple environments (dev, staging, prod)

**Use plain Terraform when:**
- Single Terraform project not in a monorepo
- Simple infrastructure with no module dependencies
- Not using Nx for other projects

### How is this different from Terragrunt?

**nx-terraform** and **Terragrunt** solve similar problems but differently:

| Feature | nx-terraform | Terragrunt |
|---------|--------------|------------|
| DRY configurations | Module reuse | `terragrunt.hcl` includes |
| Dependency management | Automatic detection | Manual `dependency` blocks |
| Caching | Nx caching system | No built-in caching |
| Integration | Nx monorepo ecosystem | Standalone Terraform wrapper |
| Backend management | Backend projects | Remote state config |

Choose **nx-terraform** if you're already using Nx. Choose **Terragrunt** if you need a standalone Terraform tool.

### Does nx-terraform require Terraform CLI?

It's recommended but not strictly required. nx-terraform generates proper Terraform configurations and runs Terraform commands, so having the Terraform CLI installed provides the best experience. However, you can validate and format code without it using the plugin's built-in validation.

## Setup and Configuration

### How do I add nx-terraform to an existing Nx workspace?

```bash
nx add nx-terraform
nx g nx-terraform:init
```

Then create your first backend and module:
```bash
nx g nx-terraform:terraform-backend terraform-setup
nx g nx-terraform:terraform-module my-infra --backendProject=terraform-setup
```

### Can I use nx-terraform with an existing Terraform setup?

Yes! Follow these steps:

1. Add nx-terraform to your workspace
2. Move existing Terraform projects into `packages/` directory
3. Add `project.json` to each project (or run `nx g nx-terraform:terraform-module <name> --directory=packages/<name>`)
4. Update module source paths to be relative
5. Configure backend references if needed

See the [Migration Guide](/docs/guides/migration) for detailed steps.

### How do I configure AWS credentials?

nx-terraform uses the standard AWS credential chain:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM role (when running on AWS)

Configure credentials the same way you would for Terraform CLI:
```bash
aws configure
```

### Can I use a different backend than AWS S3?

Currently, nx-terraform directly supports:
- **AWS S3** - Production-ready with state locking
- **Local** - Simple file-based storage for development

For other backends (Azure Blob Storage, Google Cloud Storage, Terraform Cloud), you can:
1. Create a backend project manually
2. Configure the backend in `backend.tf`
3. Set `backendProject` metadata in consuming projects

## Project Discovery and Dependencies

### How does project discovery work?

nx-terraform discovers projects by looking for `project.json` files with Terraform metadata:

```json
{
  "metadata": {
    "nx-terraform": {
      "projectType": "stateful"  // or "backend" or "module"
    }
  }
}
```

Any project with this metadata and a `main.tf` file is automatically discovered.

### Why isn't my Terraform project discovered?

Check these common issues:

1. **Missing `project.json`** - Every project needs one
2. **Missing metadata** - Must have `metadata['nx-terraform'].projectType`
3. **Invalid project type** - Must be "backend", "stateful", or "module"
4. **Missing `main.tf`** - Projects need at least one `.tf` file

Run this to verify:
```bash
nx show projects  # Should list your project
```

### How are module dependencies detected?

Dependencies are detected by parsing Terraform files for `module` blocks with local paths:

```hcl
module "networking" {
  source = "../networking"  # Creates dependency: current-project → networking
}
```

The plugin matches the last segment of the path (`networking`) against project names in your workspace.

### Can I manually override dependencies?

Yes, add explicit dependencies in `project.json`:

```json
{
  "implicitDependencies": ["some-other-project"]
}
```

This is useful for non-module dependencies like data sources or when the automatic detection doesn't work.

### What if two modules have the same name?

Module dependencies are matched by the **last path segment**. If you have:
- `packages/shared/networking`
- `packages/aws/networking`

Both have the same name ("networking"). To avoid conflicts:
1. Use unique project names in `project.json`
2. Reference modules by the unique name
3. Organize projects to avoid naming conflicts

## Caching

### What operations are cached?

**Cached operations** (fast when inputs unchanged):
- `terraform-fmt` - Code formatting
- `terraform-validate` - Configuration validation
- Backend project init/plan/apply (state-independent)

**Never cached** (always run fresh):
- Stateful project init/plan/apply/destroy (state-dependent)
- `terraform-output` (depends on current state)

See [Caching Guide](/docs/guides/caching) for details.

### Why isn't my operation cached?

Common reasons:
1. **State-dependent operation** - Plan/apply on stateful projects always runs fresh for safety
2. **Files changed** - Any `.tf`, `.tfvars`, or input file change invalidates cache
3. **Cache cleared** - `nx reset` clears all caches
4. **Different inputs** - Command-line arguments or environment variables changed

### Can I force an operation to run without cache?

Yes, use `--skip-nx-cache`:
```bash
nx run my-project:terraform-validate --skip-nx-cache
```

### How does caching work with remote state?

Stateful projects that use remote state don't cache state-dependent operations (`init`, `plan`, `apply`, `destroy`) to ensure you always work with the latest state. Only validation and formatting are cached.

## Multi-Environment Management

### How do I manage multiple environments?

Create separate projects for each environment:

```bash
# Shared backend (one S3 bucket, separate state files)
nx g nx-terraform:terraform-backend terraform-setup

# Environment-specific infrastructure
nx g nx-terraform:terraform-module dev-infra --backendProject=terraform-setup
nx g nx-terraform:terraform-module staging-infra --backendProject=terraform-setup
nx g nx-terraform:terraform-module prod-infra --backendProject=terraform-setup
```

Use `tfvars` files for environment-specific configuration:
```bash
nx run prod-infra:terraform-apply -- -var-file=tfvars/prod.tfvars
```

See [Multiple Environments Example](/docs/examples/multiple-environments).

### Should each environment have its own backend?

**Option 1: Shared Backend** (Recommended)
- One S3 bucket for all environments
- Separate state files (key prefix per project)
- Simpler setup, less infrastructure

**Option 2: Separate Backends**
- One backend project per environment
- Complete state isolation
- Better for strict security requirements

Most teams use Option 1 for simplicity.

### How do I prevent accidentally deploying to production?

**Best practices:**
1. Use separate AWS accounts for production
2. Require MFA for production deployments
3. Use CI/CD with manual approval steps
4. Restrict production credentials
5. Add confirmation prompts in scripts

**Example deployment script:**
```bash
#!/bin/bash
if [ "$ENV" = "prod" ]; then
  read -p "⚠️  Deploy to PRODUCTION? (yes/no) " -r
  if [ "$REPLY" != "yes" ]; then exit 1; fi
fi
nx run ${ENV}-infra:terraform-apply
```

## Troubleshooting

### Error: "Project not found"

**Cause:** Nx can't find your Terraform project.

**Solution:**
```bash
# Verify project is discovered
nx show projects

# Check project.json has correct metadata
cat packages/my-project/project.json
# Should have: "metadata": { "nx-terraform": { "projectType": "..." } }
```

### Error: "Backend configuration changed"

**Cause:** Backend configuration in `backend.tf` doesn't match initialized backend.

**Solution:**
```bash
# Re-initialize with new backend configuration
nx run my-project:terraform-init -reconfigure
```

### Error: "Module not found"

**Cause:** Module source path is incorrect or module doesn't exist.

**Solution:**
1. Verify module path is relative and correct
2. Check module project exists: `nx show projects`
3. Verify project name matches module path last segment

### Plans show unexpected changes after workspace reorganization

**Cause:** State file references old paths or resources.

**Solution:**
```bash
# Verify state
nx run my-project:terraform-show

# If needed, update state with moved resources
terraform state mv 'old.resource' 'new.resource'
```

### Operations are slow even with caching

**Common causes:**
1. **Large files** - Minimize large files in project directories
2. **Too many inputs** - Nx tracks all `.tf` files; optimize your project structure
3. **State-dependent operations** - These never cache for safety
4. **Provider downloads** - First run downloads providers (cached afterward)

**Solutions:**
- Use `.gitignore` for generated files
- Split large projects into smaller modules
- Use Nx Cloud for distributed caching

## CI/CD Integration

### How do I use nx-terraform in CI/CD?

Basic example for GitHub Actions:

```yaml
name: Terraform
on: [push]
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Validate
        run: npx nx run-many --target=terraform-validate
      - name: Plan
        run: npx nx run-many --target=terraform-plan
```

See [CI/CD Integration Guide](/docs/guides/ci-cd) for complete examples.

### Should I run Terraform apply in CI?

**For non-production:**
Yes, automate deployments to dev/staging.

**For production:**
Most teams use manual approval steps:
1. CI runs `terraform-plan`
2. Human reviews plan
3. Manual trigger for `terraform-apply`

### How do I handle Terraform state in CI?

Use remote backends (AWS S3):
- State stored remotely, not in CI
- CI only needs read/write access to S3
- State locking prevents concurrent modifications
- No need to cache state in CI

## Performance and Optimization

### How can I speed up Terraform operations?

1. **Leverage caching** - Validation and formatting are cached
2. **Use Nx Cloud** - Distributed caching across team
3. **Split large projects** - Smaller modules = faster plans
4. **Parallelize independent operations** - Use `nx run-many --parallel`
5. **Cache provider plugins** - Set `TF_PLUGIN_CACHE_DIR` environment variable

### Does nx-terraform work with large Terraform projects?

Yes, but consider:
- **Monolithic projects** - Nx helps but Terraform itself may be slow
- **Split into modules** - Break large projects into smaller modules
- **Selective execution** - Use `nx affected` to only run changed projects

### Can I run operations in parallel?

Yes! Independent Terraform projects can run in parallel:

```bash
# Validate all projects in parallel
nx run-many --target=terraform-validate --parallel=3

# Format all projects in parallel
nx run-many --target=terraform-fmt --parallel=5
```

For dependent projects, Nx automatically runs them in the correct order.

## Advanced Usage

### Can I customize Terraform command arguments?

Yes, pass extra arguments after `--`. For environment-specific var files, use **configurations** in `project.json` and `--configuration=<env>` instead of passing `-var-file` each time. Example:

```bash
nx run my-project:terraform-plan --configuration=prod
nx run my-project:terraform-apply --configuration=prod
```

To pass ad-hoc variables:

```bash
nx run my-project:terraform-plan -- -var="instance_type=t3.large"
```

### How do I use different Terraform versions per project?

Use a Terraform version manager like `tfenv`:

```bash
# Install tfenv
brew install tfenv

# Set version per project
cd packages/my-project
echo "1.6.0" > .terraform-version
```

Nx will use the version specified when running commands from that directory.

### Can I use Terraform workspaces?

Yes, but it's not recommended. Instead:
- Use separate Nx projects for environments (preferred)
- If you must use workspaces, select the workspace before running:

```bash
terraform workspace select dev
nx run my-project:terraform-plan
```

### How do I handle secrets?

**Never commit secrets to version control!**

Options:
1. **Environment variables**:
   ```bash
   export TF_VAR_api_key="secret"
   nx run my-project:terraform-apply
   ```

2. **AWS Secrets Manager / HashiCorp Vault**:
   ```hcl
   data "aws_secretsmanager_secret_version" "api_key" {
     secret_id = "my-api-key"
   }
   ```

3. **CI/CD secret storage** (GitHub Secrets, etc.)

## Getting Help

### Where can I get help?

- 📖 [Documentation](https://alexpialetski.github.io/nx-terraform/)
- 🐛 [Report Issues](https://github.com/alexpialetski/nx-terraform/issues)
- 💬 [GitHub Discussions](https://github.com/alexpialetski/nx-terraform/discussions)
- 📚 [Troubleshooting Guide](/docs/guides/troubleshooting)

### How do I report a bug?

1. Check [existing issues](https://github.com/alexpialetski/nx-terraform/issues)
2. Gather information:
   - nx-terraform version: `npm list nx-terraform`
   - Nx version: `nx --version`
   - Terraform version: `terraform --version`
   - Error messages and logs
3. [Create an issue](https://github.com/alexpialetski/nx-terraform/issues/new) with details

### How do I request a feature?

Open a [feature request](https://github.com/alexpialetski/nx-terraform/issues/new) with:
- Use case description
- Expected behavior
- Why this would be valuable
- Any examples or alternatives you've considered

## Related Resources

- [Troubleshooting Guide](/docs/guides/troubleshooting) - Common issues and solutions
- [Best Practices](/docs/guides/best-practices) - Recommended patterns
- [Project Types](/docs/guides/project-types) - Understanding project types
- [Caching Guide](/docs/guides/caching) - How caching works
