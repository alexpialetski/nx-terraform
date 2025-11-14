# Setup Terraform Composite Action

This focused composite action sets up the Terraform environment for infrastructure workflows. It assumes Node.js and AWS credentials are already configured.

## What it does

1. **Terraform Setup**: Installs and configures Terraform with the specified version
2. **Environment Variables**: Sets `TF_VAR_region` and `TF_VAR_account_id` from provided inputs
3. **Format Check**: Validates Terraform code formatting across all projects
4. **Setup Validation**: Validates setup infrastructure configuration
5. **Backend Setup**: Optionally deploys setup infrastructure for Terraform backend

## Usage

```yaml
steps:
  - name: Setup Terraform Environment
    uses: ./.github/actions/setup-terraform
    with:
      aws-region: ${{ env.AWS_REGION }}
      aws-account-id: ${{ steps.aws-setup.outputs.aws-account-id }}
```

## Inputs

| Input               | Description                          | Required | Default  |
| ------------------- | ------------------------------------ | -------- | -------- |
| `aws-region`        | AWS Region                           | Yes      | -        |
| `aws-account-id`    | AWS Account ID                       | Yes      | -        |
| `terraform-version` | Terraform version                    | No       | `~1.8.0` |
| `skip-setup-apply`  | Skip setup infrastructure deployment | No       | `false`  |

## Outputs

| Output       | Description           |
| ------------ | --------------------- |
| `aws-region` | AWS Region being used |

## Prerequisites

This action assumes the following are already set up:

- **Node.js environment** with npm dependencies installed
- **AWS credentials** configured in the environment
- **Nx workspace** properly configured

## Used By

- **ci.yml**: Main CI/CD pipeline for infrastructure deployment
- **pr-validation.yml**: Pull request validation workflow
- **manual-infrastructure.yml**: Manual infrastructure management workflow

## Example with Outputs

```yaml
steps:
  # Prerequisites: AWS credentials and Node.js already set up
  - name: Setup Node.js and AWS
    uses: ./.github/actions/setup-node-aws
    id: aws-setup
    with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: ${{ env.AWS_REGION }}

  - name: Setup Terraform Environment
    id: terraform-setup
    uses: ./.github/actions/setup-terraform
    with:
      aws-region: ${{ env.AWS_REGION }}
      aws-account-id: ${{ steps.aws-setup.outputs.aws-account-id }}

  - name: Use outputs
    run: |
      echo "AWS Region: ${{ steps.terraform-setup.outputs.aws-region }}"
```

## Benefits

- **Focused**: Dedicated to Terraform environment setup only
- **Flexible**: Works with different AWS credential setups
- **Validation**: Ensures code formatting and setup validation
- **Backend Ready**: Automatically handles Terraform backend deployment
- **Configurable**: Optional setup deployment for different scenarios
