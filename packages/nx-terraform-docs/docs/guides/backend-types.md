---
sidebar_position: 2
---

# Backend Types

The nx-terraform plugin supports two backend types for Terraform state storage. Choosing the right backend type is crucial for your infrastructure management strategy.

## Overview

A Terraform backend determines where state is stored and how it's managed. The plugin supports:

1. **AWS S3 Backend** - Production-ready remote state storage
2. **Local Backend** - Simple local file storage

## AWS S3 Backend

Production-ready remote state storage using AWS S3 with optional DynamoDB state locking.

### Characteristics

- **State Storage**: AWS S3 bucket
- **State Locking**: DynamoDB table (optional but recommended)
- **Versioning**: Enabled by default
- **Encryption**: Enabled by default
- **Access Control**: IAM-based
- **Team Collaboration**: Full support
- **Use Case**: Production environments, team projects

### Configuration

When creating a backend with AWS S3:

```bash
nx g nx-terraform:terraform-backend my-backend --backendType=aws-s3
```

### Generated Infrastructure

The backend project creates:

1. **S3 Bucket**
   - Versioning enabled
   - Encryption enabled
   - Object lock for state protection
   - Dynamic bucket naming

2. **DynamoDB Table** (optional)
   - Used for state locking
   - Prevents concurrent modifications
   - Ensures state consistency

### Backend Configuration

After applying, `backend.config` is generated:

```hcl
bucket = "my-workspace-terraform-setup-abc123"
key    = "terraform-setup/terraform.tfstate"
region = "us-east-1"
dynamodb_table = "terraform-setup-lock"
encrypt = true
```

### Requirements

- AWS account
- AWS credentials configured
- IAM permissions:
  - `s3:CreateBucket`
  - `s3:PutObject`
  - `s3:GetObject`
  - `dynamodb:CreateTable` (if using locking)
  - `dynamodb:PutItem`
  - `dynamodb:GetItem`

### Advantages

- ✅ Production-ready
- ✅ Supports team collaboration
- ✅ State locking prevents conflicts
- ✅ Versioning for state history
- ✅ Encryption at rest
- ✅ Scalable and reliable

### Disadvantages

- ❌ Requires AWS account and credentials
- ❌ More complex setup
- ❌ Potential costs (S3 storage, DynamoDB)

### Best Practices

1. **Enable State Locking**: Always use DynamoDB for state locking in production
2. **Use Separate Buckets**: Consider separate buckets for different environments
3. **Enable Versioning**: Keep state history for recovery
4. **Access Control**: Use IAM policies to restrict access
5. **Backup Strategy**: Consider cross-region replication for critical state

## Local Backend

Simple local file storage for Terraform state.

### Characteristics

- **State Storage**: Local `terraform.tfstate` file
- **State Locking**: None
- **Versioning**: None (manual backup required)
- **Encryption**: None (file system dependent)
- **Access Control**: File system permissions
- **Team Collaboration**: Limited (file conflicts)
- **Use Case**: Development, testing, single-user scenarios

### Configuration

When creating a backend with local storage:

```bash
nx g nx-terraform:terraform-backend my-backend --backendType=local
```

### Backend Configuration

The backend uses a simple local configuration:

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

### State File Location

State is stored in the project directory:
```
packages/terraform-setup/terraform.tfstate
```

### Advantages

- ✅ Simple setup (no AWS required)
- ✅ No additional costs
- ✅ Fast (local file system)
- ✅ Good for development
- ✅ Easy to backup manually

### Disadvantages

- ❌ No state locking (concurrent access issues)
- ❌ Not suitable for teams
- ❌ No automatic versioning
- ❌ Manual backup required
- ❌ File conflicts in shared environments

### Best Practices

1. **Version Control**: Add `*.tfstate` to `.gitignore` (state may contain secrets)
2. **Manual Backups**: Regularly backup state files
3. **Single User**: Use only for single-user scenarios
4. **Development Only**: Don't use for production
5. **State Security**: Be careful with state files (may contain sensitive data)

## Comparison

| Feature | AWS S3 Backend | Local Backend |
|---------|---------------|---------------|
| **State Storage** | S3 bucket | Local file |
| **State Locking** | Yes (DynamoDB) | No |
| **Versioning** | Yes (automatic) | No |
| **Encryption** | Yes (S3 encryption) | File system dependent |
| **Team Support** | Excellent | Poor |
| **Setup Complexity** | Medium | Low |
| **Cost** | Low (S3 storage) | Free |
| **Scalability** | High | Low |
| **Production Ready** | Yes | No |
| **Use Case** | Production, teams | Development, single user |

## Choosing the Right Backend

### Choose AWS S3 If:

- You're working in a team
- You need production-grade state management
- You want state locking
- You need state versioning
- You're deploying to AWS

### Choose Local If:

- You're developing locally
- You're the only user
- You want the simplest setup
- You're just learning
- You don't have AWS access

## Migration Between Backends

### From Local to AWS S3

1. Create a new AWS S3 backend project
2. Apply the backend to create infrastructure
3. Update stateful projects to use the new backend
4. Migrate state (if needed):
   ```bash
   terraform init -migrate-state
   ```

### From AWS S3 to Local

1. Update backend configuration to local
2. Reinitialize:
   ```bash
   terraform init -migrate-state
   ```
3. State will be copied to local file

:::warning
Migrating state can be risky. Always backup state before migration.
:::

## Backend Configuration Files

### backend.config (AWS S3)

Generated after backend apply:

```hcl
bucket = "my-workspace-terraform-setup-abc123"
key    = "terraform-setup/terraform.tfstate"
region = "us-east-1"
dynamodb_table = "terraform-setup-lock"
encrypt = true
```

### backend.tf (Stateful Projects)

References the backend configuration:

```hcl
terraform {
  backend "s3" {
    config_file = "../../terraform-setup/backend.config"
  }
}
```

Or for local:

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

## Security Considerations

### AWS S3 Backend

- Use IAM roles with least privilege
- Enable encryption at rest
- Use bucket policies for access control
- Enable MFA delete (optional)
- Monitor access with CloudTrail

### Local Backend

- Add `*.tfstate` to `.gitignore`
- Use file system permissions
- Encrypt sensitive state files
- Regular backups
- Don't commit state to version control

## Troubleshooting

For backend-related issues, see the [Troubleshooting Guide](/docs/guides/troubleshooting#backend-issues).

## Related Topics

- [Project Types](/docs/guides/project-types) - Learn about different project types
- [Configuration](/docs/guides/configuration) - Understand backend configuration
- [Terraform Backend Generator](/docs/reference/generators/terraform-backend) - Generator reference

