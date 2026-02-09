---
sidebar_position: 7
---

# Troubleshooting

Common issues and solutions when working with nx-terraform.

## Installation Issues

### Plugin Not Found

**Symptoms:**
- Error: "Plugin not found" or "Cannot find module 'nx-terraform'"
- Generators not available

**Solutions:**

1. **Reinstall the plugin:**
   ```bash
   nx add nx-terraform
   ```

2. **Verify installation:**
   ```bash
   nx list nx-terraform
   ```

3. **Check plugin registration in `nx.json`:**
   ```json
   {
     "plugins": [
       {
         "plugin": "nx-terraform",
         "options": {}
       }
     ]
   }
   ```

4. **Clear Nx cache:**
   ```bash
   nx reset
   ```

## Project Discovery Issues

### Project Not Discovered

**Symptoms:**
- Project doesn't appear in `nx show projects`
- No targets available for the project
- Error: "Project not found"

**Solutions:**

1. **Check project configuration:**
   ```bash
   # Verify project.json exists
   ls packages/my-project/project.json
   
   # Check that metadata['nx-terraform'].projectType is set
   cat packages/my-project/project.json | jq '.metadata["nx-terraform"].projectType'
   ```
   Discovery is triggered by `project.json`; the project must have `metadata['nx-terraform'].projectType` set to `backend`, `stateful`, or `module`. Use the plugin generators to create projects, or add this metadata manually.

2. **Verify file locations:**
   - `project.json` must exist in the project root
   - Directory structure must be correct (Terraform files such as `main.tf` typically live in the same directory)

3. **Check plugin is registered:**
   ```bash
   cat nx.json | grep nx-terraform
   ```

4. **Restart Nx daemon:**
   ```bash
   nx reset
   ```

### Wrong Project Type

**Symptoms:**
- Project discovered but wrong type
- Targets not working as expected
- Incorrect caching behavior

**Solutions:**

1. **Check `projectType` in `project.json`:**
   ```json
   {
     "projectType": "application"  // or "library"
   }
   ```

2. **Check metadata:** Ensure `metadata['nx-terraform'].projectType` is set. For stateful projects, ensure `targets['terraform-init'].metadata.backendProject` is set (see [Configuration](/docs/guides/configuration)).
   ```json
   {
     "metadata": {
       "nx-terraform": {
         "projectType": "module"
       }
     }
   }
   ```

3. **Use sync generator:**
   ```bash
   nx g nx-terraform:sync-terraform-metadata
   ```

## Backend Issues

### Backend Connection Errors

**Symptoms:**
- Error: "Failed to get existing workspaces"
- Error: "Backend configuration error"
- Cannot initialize stateful projects

**Solutions:**

1. **For AWS S3 backend:**
   - Ensure AWS credentials are configured:
     ```bash
     aws configure
     # Or set environment variables:
     export AWS_ACCESS_KEY_ID=your-key
     export AWS_SECRET_ACCESS_KEY=your-secret
     ```
   - Verify the backend project has been applied:
     ```bash
     nx run terraform-setup:terraform-apply
     ```
   - Check that `backend.config` exists:
     ```bash
     ls packages/terraform-setup/backend.config
     ```

2. **For local backend:**
   - Verify backend configuration in `backend.tf`
   - Check file permissions

3. **Verify backend project exists:**
   ```bash
   nx show project terraform-setup
   ```

### Backend Already Exists (AWS S3)

**Symptoms:**
- Error: "Bucket already exists"
- Terraform import errors

**Solutions:**

1. **Use unique bucket name prefix:**
   ```bash
   nx g nx-terraform:terraform-backend my-backend \
     --backendType=aws-s3 \
     --bucketNamePrefix=myorg-terraform
   ```

2. **Manually specify existing bucket** (if reusing)

3. **Import existing bucket** (advanced)

### AWS Credentials Not Configured

**Symptoms:**
- Error: "No valid credential sources found"
- Authentication failures

**Solutions:**

1. **Configure AWS CLI:**
   ```bash
   aws configure
   ```

2. **Set environment variables:**
   ```bash
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   export AWS_REGION=us-east-1
   ```

3. **Use IAM roles** (for EC2/ECS)

### Permission Denied

**Symptoms:**
- Error: "Access Denied" or "Permission denied"
- Cannot create S3 buckets or DynamoDB tables

**Solutions:**

1. **Check IAM permissions.** Your AWS credentials need:
   - `s3:CreateBucket`
   - `s3:PutObject`
   - `s3:GetObject`
   - `dynamodb:CreateTable` (if using state locking)
   - `dynamodb:PutItem`
   - `dynamodb:GetItem`

2. **Verify IAM user/role has correct policies**

3. **Check bucket policies** (if bucket exists)

## Dependency Issues

### Dependency Not Detected

**Symptoms:**
- Project runs before dependency
- Errors about missing resources
- Wrong execution order

**Solutions:**

1. **Check module reference syntax:**
   ```hcl
   module "networking" {
     source = "../../networking"  // Must use relative path
   }
   ```

2. **Verify project names match directory names**

3. **Check `terraform-init` target options are correct** (backend project name):
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

4. **Verify projects are discovered:**
   ```bash
   nx show projects
   ```

### Circular Dependency

**Symptoms:**
- Nx error about circular dependencies
- Projects can't determine execution order

**Solutions:**

1. **Review module references** - identify the cycle

2. **Break circular dependencies:**
   - Extract common code to shared module
   - Use data sources instead of module references
   - Restructure project dependencies

3. **Example fix:**
   ```hcl
   // Before (circular):
   // app-a uses app-b, app-b uses app-a
   
   // After (fixed):
   // app-a uses shared, app-b uses shared
   ```

### Wrong Execution Order

**Symptoms:**
- Backend not applied before infrastructure
- Modules not validated before use

**Solutions:**

1. **Check target dependencies:**
   ```bash
   nx show project my-infra --json | jq '.targets["terraform-init"].dependsOn'
   ```

2. **Verify project dependencies:**
   ```bash
   nx graph
   ```

3. **Review `dependsOn` configuration** in project.json

## Configuration Issues

### Configuration Not Found

**Symptoms:**
- Error: "Missing tfvars file"
- Variables not applied

**Solutions:**

1. **Verify `tfvars` file exists:**
   ```bash
   ls packages/my-infra/tfvars/dev.tfvars
   ```

2. **Check file naming matches configuration:**
   - `--configuration=dev` → `tfvars/dev.tfvars`
   - `--configuration=prod` → `tfvars/prod.tfvars`

3. **Verify file is in project directory**

### Variables Not Applied

**Symptoms:**
- Variables not taking effect
- Wrong values used

**Solutions:**

1. **Check `tfvars` file syntax** - must be valid HCL

2. **Verify variable names match** in `variables.tf` and `tfvars` file

3. **Check for typos** in variable names

4. **Verify configuration is used:**
   ```bash
   nx run my-infra:terraform-plan --configuration=dev
   ```

## Caching Issues

### Cache Not Working

**Symptoms:**
- Operations always run
- No cache hits

**Solutions:**

1. **Check cache is enabled** for the operation (see [Caching Guide](/docs/guides/caching))

2. **Verify file inputs haven't changed:**
   - Check `.tf` and `.tfvars` files
   - Check `backend.config` (if using remote backend)

3. **Clear and rebuild cache:**
   ```bash
   nx reset
   ```

### Stale Cache

**Symptoms:**
- Results don't match expectations
- Cache shows old results

**Solutions:**

1. **Clear cache:**
   ```bash
   nx reset
   ```

2. **Check for file changes** that should invalidate cache

3. **Verify cache inputs** are correct

## Terraform-Specific Issues

### Provider Not Found

**Symptoms:**
- Error: "Provider not found"
- Cannot download providers

**Solutions:**

1. **Check provider configuration** in `provider.tf`

2. **Verify Terraform version** compatibility

3. **Check network connectivity** (for provider downloads)

4. **Clear Terraform cache:**
   ```bash
   rm -rf .terraform
   nx run my-project:terraform-init
   ```

### State Lock Errors

**Symptoms:**
- Error: "Error acquiring the state lock"
- Cannot apply changes

**Solutions:**

1. **Check if another process is running** Terraform

2. **For DynamoDB locks:**
   - Check DynamoDB table exists
   - Verify permissions
   - Manually release lock if needed (advanced)

3. **Wait for lock to release** (if another process is running)

### State File Conflicts

**Symptoms:**
- State conflicts between environments
- Wrong state file used

**Solutions:**

1. **Ensure each environment uses different state key:**
   - `dev-infra/terraform.tfstate`
   - `prod-infra/terraform.tfstate`

2. **Verify backend configuration** is correct

3. **Don't copy state files** between environments

## Getting More Help

### Enable Debug Logging

```bash
export TF_LOG=DEBUG
nx run my-project:terraform-plan
```

### Check Nx Logs

```bash
nx show project my-project --json
```

### View Project Graph

```bash
nx graph
```

### Common Resources

- [Project Discovery Guide](/docs/guides/project-discovery)
- [Dependencies Guide](/docs/guides/dependencies)
- [Configuration Guide](/docs/guides/configuration)
- [Backend Types Guide](/docs/guides/backend-types)

## Still Having Issues?

If you're still experiencing problems:

1. **Check the [GitHub Issues](https://github.com/alexpialetski/nx-terraform/issues)**
2. **Review the [Reference Documentation](/docs/reference/generators/init)**
3. **Open a new issue** with:
   - Error messages
   - Steps to reproduce
   - Nx and Terraform versions
   - Relevant configuration files

