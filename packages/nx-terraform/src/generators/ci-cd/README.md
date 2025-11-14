# CI/CD Generator

Generates GitHub Actions workflows and composite actions for Terraform projects in your Nx workspace.

## Usage

```bash
nx g nx-terraform:ci-cd
```

## Options

### `ciProvider` (required)

- **Type**: `string`
- **Default**: `github-actions`
- **Description**: CI/CD provider to use. Currently only `github-actions` is supported.

### `enableSecurityScan` (optional)

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable security scanning in PR validation workflow using Checkov and TFSec.

## What It Does

The generator automatically:

1. **Discovers Terraform Projects**: Scans your workspace for all projects with `metadata['nx-terraform'].projectType` set
2. **Analyzes Dependencies**: Uses Nx project graph to understand execution order
3. **Generates Workflows**: Creates three GitHub Actions workflows:
   - `ci.yml` - Main CI/CD pipeline
   - `pr-validation.yml` - Pull request validation
   - `manual-infrastructure.yml` - Manual infrastructure management
4. **Creates Composite Actions**: Generates reusable composite actions for setup

## Generated Files

### Workflows

#### `.github/workflows/ci.yml`

Main CI/CD pipeline that runs on push to `main` branch:

- **validate**: Validates all affected Terraform projects
- **plan**: Creates execution plans for all affected projects
- **deploy**: Applies infrastructure changes (production environment)
- **cleanup**: Manual destroy workflow

#### `.github/workflows/pr-validation.yml`

Pull request validation workflow:

- **validate**: Validates affected Terraform projects
- **plan**: Plans affected projects
- **security-scan**: Optional security scanning (if enabled)

#### `.github/workflows/manual-infrastructure.yml`

Manual workflow dispatch for infrastructure management:

- Supports `plan`, `apply`, and `destroy` actions
- Allows selecting specific Terraform project
- Supports multiple environments (dev, default)

### Composite Actions

#### `.github/actions/setup-terraform/action.yml`

Sets up Terraform environment:

- Installs Terraform
- Configures AWS environment variables
- Runs format check
- Validates and applies backend projects (if any)

#### `.github/actions/setup-node-aws/action.yml`

Sets up Node.js and AWS credentials:

- Installs Node.js and dependencies
- Configures AWS credentials
- Sets up Nx affected commands

## Configuration

### Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

- `AWS_ACCESS_KEY_ID`: AWS access key ID for Terraform operations
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key for Terraform operations

### Optional GitHub Variables

- `AWS_REGION`: AWS region for deployment (default: `us-east-1`)

### GitHub Environments

Configure these environments in your repository (Settings > Environments):

#### `production`

- **Purpose**: Production deployments from `main` branch
- **Protection Rules**: Recommended to require reviewers for manual approval
- **Deployment Branches**: Only `main` branch

#### `dev`

- **Purpose**: Development deployments and testing
- **Protection Rules**: Optional, can be left unrestricted

## Project Discovery

The generator automatically discovers Terraform projects by:

1. Scanning all projects in the workspace
2. Filtering projects with `metadata['nx-terraform'].projectType` set
3. Categorizing projects:
   - **Backend projects**: Projects with `projectType: 'backend'`
   - **Stateful projects**: Projects with `backendProject` metadata
   - **Module projects**: Simple modules without backend

## Dependency Management

The generator uses Nx project graph to:

- Determine execution order (backend projects before stateful projects)
- Build job dependencies in workflows
- Ensure proper deployment sequence

## Workflow Features

### Nx Affected Commands

All workflows use `nx affected` commands to:

- Only process changed Terraform projects
- Respect project dependencies
- Optimize CI execution time

### AWS Region

AWS region is hardcoded as `us-east-1` in generated workflows. You can override this using the `AWS_REGION` GitHub variable.

## Examples

### Basic Usage

```bash
# Generate workflows with default options (security scan enabled)
nx g nx-terraform:ci-cd
```

### Disable Security Scanning

```bash
# Generate workflows without security scanning
nx g nx-terraform:ci-cd --enableSecurityScan=false
```

## Troubleshooting

### No Workflows Generated

If no workflows are generated, ensure you have at least one Terraform project in your workspace with `metadata['nx-terraform'].projectType` set.

### Workflow Validation Errors

If workflows fail validation:

1. Ensure all required GitHub secrets are configured
2. Verify Terraform projects are correctly configured
3. Check that composite actions are generated correctly

### Act Testing

For local testing with Act:

1. Install Act: `curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash`
2. Run Act tests: `nx run nx-terraform-e2e:e2e`

## Related Documentation

- [Main Plugin README](../../README.md) - Plugin features and usage
- [Terraform Backend Generator](../terraform-backend/README.md) - Backend project creation
- [Terraform Module Generator](../terraform-module/README.md) - Module project creation
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
