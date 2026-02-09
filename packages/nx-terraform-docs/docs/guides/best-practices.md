---
sidebar_position: 8
---

# Best Practices

Recommended practices for using nx-terraform effectively in your infrastructure projects.

## Project Organization

### Project Structure

Organize projects logically:

```
packages/
├── terraform-setup/      # Backend (one per workspace/environment)
├── networking/           # Shared modules
├── security/             # Shared modules
├── terraform-infra/      # Infrastructure
```

### Separation of Concerns

- **Keep backends separate** from infrastructure projects
- **Use modules** for reusable patterns and shared code
- **Keep stateful projects focused** on specific infrastructure domains
- **Separate environments** into different projects

## Backend Management

### Backend Selection

- **Production**: Use AWS S3 backend with DynamoDB state locking
- **Development**: Local backend is acceptable for single-user scenarios
- **Teams**: Always use remote backend (AWS S3) to avoid conflicts

### Backend Best Practices

1. **Enable State Locking**: Always use DynamoDB for state locking in production
2. **Use Separate Buckets**: Consider separate buckets for different environments
3. **Enable Versioning**: Keep state history for recovery
4. **Access Control**: Use IAM policies to restrict access
5. **Backup Strategy**: Consider cross-region replication for critical state

### State Management

- **One backend per workspace** (or environment)
- **Separate state files** for each project
- **Never share state** between environments
- **Backup state files** regularly (especially for production)

## Module Design

### Reusable Modules

1. **Clear Interface**: Define clear inputs and outputs

   ```hcl
   variable "vpc_cidr" {
     description = "CIDR block for VPC"
     type        = string
   }
   ```

2. **Documentation**: Document your modules

   - Purpose and use cases
   - Input variables
   - Output values
   - Examples

3. **Versioning**: Consider versioning for shared modules

4. **Testing**: Test modules independently

   ```bash
   nx run networking:terraform-validate
   nx run networking:terraform-fmt
   ```

5. **Reusability**: Design for reuse
   - Avoid hardcoded values
   - Use variables for customization
   - Provide sensible defaults
   - Support multiple use cases

### Module Patterns

- **Infrastructure Modules**: Define infrastructure patterns
- **Utility Modules**: Provide utilities and helpers
- **Composite Modules**: Combine other modules

## Environment Management

### Environment Separation

- **Separate projects** for each environment (dev, staging, prod)
- **Separate state files** per environment
- **Environment-specific variables** via `tfvars` files
- **Clear naming** to identify environments

### Environment Configuration

1. **Use tfvars files** for environment-specific values:

   ```
   packages/my-infra/
   └── tfvars/
       ├── dev.tfvars
       ├── staging.tfvars
       └── prod.tfvars
   ```

2. **Environment tags** to identify resources:

   ```hcl
   tags = {
     Environment = var.environment
     ManagedBy   = "nx-terraform"
   }
   ```

3. **Access control**: Restrict production access to senior engineers

4. **Testing strategy**:
   - Test changes in dev first
   - Promote to staging for integration testing
   - Deploy to prod only after validation

## Dependency Management

### Dependency Best Practices

1. **Clear Dependency Structure**:

   - Keep dependencies shallow when possible
   - Avoid deep dependency chains
   - Use clear naming

2. **Module Organization**:

   - Create reusable modules for shared code
   - Reference modules explicitly
   - Document module dependencies

3. **Backend Management**:

   - One backend per workspace (or environment)
   - Clear backend → infrastructure relationships
   - Document backend dependencies

4. **Avoid Circular Dependencies**:
   - Design modules to avoid cycles
   - Use data sources for cross-references
   - Extract common code to shared modules

## Configuration Management

### Variable Management

1. **Clear variable names** with descriptions
2. **Provide sensible defaults** where appropriate
3. **Document variable purposes**
4. **Use type constraints** for validation

### Secrets Management

1. **Don't commit secrets** to `tfvars` files
2. **Use environment variables** for secrets
3. **Consider secret management tools** (AWS Secrets Manager, HashiCorp Vault)
4. **Use `.gitignore`** for sensitive files

### Configuration Files

- Keep environment configs in version control
- Document environment-specific requirements
- Use consistent naming conventions

## Security

### Backend Security (AWS S3)

1. **IAM Roles**: Use IAM roles with least privilege
2. **Encryption**: Enable encryption at rest
3. **Bucket Policies**: Use bucket policies for access control
4. **MFA Delete**: Enable MFA delete (optional)
5. **Monitoring**: Monitor access with CloudTrail

### Local Backend Security

1. **Git Ignore**: Add `*.tfstate` to `.gitignore`
2. **File Permissions**: Use file system permissions
3. **Encryption**: Encrypt sensitive state files
4. **Backups**: Regular backups
5. **Version Control**: Don't commit state to version control

### General Security

- **State files may contain secrets** - handle with care
- **Use remote backends** for team collaboration
- **Restrict access** to production environments
- **Audit changes** regularly

## Performance and Caching

### Leverage Caching

1. **Run cached operations frequently**:

   - `terraform-fmt` (fast when cached)
   - `terraform-validate` (cached when unchanged)

2. **Understand cache invalidation**:

   - Know which operations are cached
   - Understand when cache invalidates
   - Don't rely on cache for state-dependent operations

3. **Optimize for caching**:
   - Keep files organized
   - Minimize unnecessary changes
   - Use consistent Terraform versions

### CI/CD Optimization

1. **Use Nx Cloud** for distributed caching
2. **Run cached operations in parallel**
3. **Leverage incremental builds**
4. **Cache provider downloads**

## Development Workflow

### Code Quality

1. **Format code regularly**:

   ```bash
   nx run my-project:terraform-fmt
   ```

2. **Validate before committing**:

   ```bash
   nx run my-project:terraform-validate
   ```

3. **Review plans before applying**:
   ```bash
   nx run my-project:terraform-plan
   ```

### Testing

1. **Test in dev first** before promoting to production
2. **Use staging** for integration testing
3. **Validate modules independently**
4. **Test dependency chains**

### Documentation

1. **Document project purposes** in README files
2. **Document dependencies** and relationships
3. **Provide usage examples**
4. **Keep documentation up to date**

## Common Patterns

### Pattern 1: Environment Tags

Add tags to identify environments:

```hcl
tags = {
  Environment = var.environment
  ManagedBy   = "nx-terraform"
  Project     = var.project_name
}
```

### Pattern 2: Environment-Specific Resources

Use conditionals for environment-specific resources:

```hcl
resource "aws_instance" "monitoring" {
  count = var.environment == "prod" ? 1 : 0
  # ... monitoring instance config
}
```

### Pattern 3: Shared Backend, Separate States

All environments can share the same backend (S3 bucket) but use different state keys:

- `dev-infra/terraform.tfstate`
- `prod-infra/terraform.tfstate`

### Pattern 4: Module Composition

Combine modules for complex infrastructure:

```hcl
module "networking" { ... }
module "security" { ... }
module "compute" { ... }
```

## Related Topics

- [Project Types](/docs/guides/project-types) - Understanding project types
- [Backend Types](/docs/guides/backend-types) - Backend selection
- [Dependencies](/docs/guides/dependencies) - Managing dependencies
- [Configuration](/docs/guides/configuration) - Configuration management
- [Troubleshooting](/docs/guides/troubleshooting) - Common issues and solutions
