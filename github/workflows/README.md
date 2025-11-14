# GitHub Actions Configuration

This document describes the CI/CD pipeline configuration for the RS School DevOps Course infrastructure deployment. The pipeline automates the deployment of a K3s Kubernetes cluster on AWS using Terraform and Nx workspace management.

The workflows are designed for scenarios where AWS accounts are temporary (like KodeKloud).

## 📋 Overview

The CI/CD pipeline consists of four main workflows:

1. **CI/CD Pipeline** (`ci.yml`) - Automated infrastructure deployment and management
2. **Deploy K8s** (`deploy-k8s.yml`) - Automated K8s application deployment
3. **PR Validation** (`pr-validation.yml`) - Pull request validation with security scanning
4. **Manual Infrastructure** (`manual-infrastructure.yml`) - Manual deployment controls

## 🔧 Required Configuration

### Secrets

Configure these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

#### AWS Configuration

- `AWS_ACCESS_KEY_ID`: AWS access key ID for Terraform operations
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key for Terraform operations

#### Optional Secrets

- `NX_CLOUD_ACCESS_TOKEN`: Nx Cloud token for distributed task execution and caching

### Variables

Configure these variables in your GitHub repository (Settings > Secrets and variables > Actions):

#### AWS Configuration

- `AWS_REGION`: AWS region for deployment (default: `us-east-1`)

### Environment Variables

The following Terraform variables are automatically configured:

- `TF_VAR_region`: Set from `AWS_REGION` variable
- `TF_VAR_account_id`: Retrieved from AWS credentials during authentication

## 🌍 Environment Configuration

### GitHub Environments

Configure these environments in your repository (Settings > Environments):

#### `production`

- **Purpose**: Production deployments from `main` branch
- **Protection Rules**:
  - Required reviewers for manual approval
  - Deployment branches: Only `main` branch
  - Environment secrets: Production AWS credentials

#### `dev`

- **Purpose**: Development deployments and testing
- **Protection Rules**: Optional, can be left unrestricted
- **Usage**: Manual deployments and testing

### Terraform Workspaces

- **Production**: Uses `default` workspace (triggered from `main` branch)
- **Development**: Uses `dev` workspace (for manual deployments)

## 🚀 Workflow Details

### 1. CI/CD Pipeline (`ci.yml`)

**Trigger**: Push to `main` branch

**Jobs**:

#### `main` Job

- **Purpose**: Infrastructure validation and planning
- **Steps**:
  1. Checkout code with full history
  2. Setup Node.js and AWS environment (setup-node-aws action)
  3. Setup Terraform environment (setup-terraform action)
  4. Plan cluster infrastructure with stable configuration
  5. Upload Terraform plans as artifacts

#### `deploy` Job

- **Purpose**: Deploy infrastructure to production
- **Dependencies**: Requires `main` job to complete
- **Environment**: `production` (manual approval required)
- **Steps**:
  1. Checkout code
  2. Setup Node.js and AWS environment (setup-node-aws action)
  3. Setup Terraform environment (setup-terraform action)
  4. Download Terraform plans
  5. Apply cluster infrastructure

#### `cleanup` Job

- **Purpose**: Destroy infrastructure (manual trigger only)
- **Trigger**: Only runs when `workflow_dispatch` event is triggered
- **Environment**: `production`
- **Steps**:
  1. Checkout code
  2. Setup Node.js and AWS environment (setup-node-aws action)
  3. Setup Terraform environment (setup-terraform action)
  4. Destroy cluster infrastructure
  5. Destroy setup infrastructure

### 2. PR Validation (`pr-validation.yml`)

**Trigger**: Pull requests to `main` branch

**Permissions**:

- `contents: read`
- `pull-requests: write`
- `issues: write`

**Jobs**:

#### `validate` Job

- **Purpose**: Validate infrastructure changes
- **Steps**:
  1. Checkout code
  2. Setup Node.js and AWS environment (setup-node-aws action)
  3. Setup Terraform environment (setup-terraform action)
  4. Validate cluster configuration
  5. Plan infrastructure changes
  6. Comment on PR with plan results (if applicable)

#### `security-scan` Job

- **Purpose**: Security scanning of infrastructure code
- **Tools**:
  - **Checkov**: Infrastructure security scanning
  - **TFSec**: Terraform security analysis
- **Output**: Security findings as PR comments

### 3. Deploy K8s (`deploy-k8s.yml`)

**Trigger**:

- Automatic: After successful CI/CD Pipeline completion
- Manual: `workflow_dispatch` with environment selection

**Jobs**:

#### `deploy-k8s` Job

- **Purpose**: Deploy applications to the K8s cluster
- **Dependencies**: Successful infrastructure deployment (ci.yml)
- **Environment**: `production` (manual approval required)
- **Steps**:
  1. Checkout code
  2. Setup Node.js and AWS environment (setup-node-aws action)
  3. Connect to K3s cluster via SSM port forwarding
  4. Verify cluster connectivity
  5. Deploy K8s applications
  6. Cleanup connections

### 4. Manual Infrastructure (`manual-infrastructure.yml`)

**Trigger**: Manual workflow dispatch

**Inputs**:

- `action`: Action to perform (`plan`, `apply`, `destroy`)
- `project`: Target project (`setup`, `cluster`)
- `environment`: Target environment (`dev`, `default`)

**Jobs**:

#### `infrastructure` Job

- **Purpose**: Manual infrastructure management
- **Environment**: Dynamic based on input
- **Steps**:
  1. Checkout code
  2. Setup Node.js and AWS environment (setup-node-aws action)
  3. Setup Terraform environment (setup-terraform action)
  4. Execute specified Terraform action
  5. Comment on manual run status (if applicable)

## 🔗 Nx Integration

### Workspace Configuration

The workflows leverage Nx workspace features:

- **Project Dependencies**: Setup → Cluster dependency management
- **Task Caching**: Faster execution with Nx caching
- **Affected Commands**: Process only changed projects in CI
- **Parallel Execution**: Run independent tasks concurrently

## 🔐 Security Features

### Pipeline Security

- **Security Scanning**: Automated with Checkov and TFSec
- **PR Comments**: Security findings reported in pull requests
- **Environment Protection**: Manual approval for production deployments
- **Credential Management**: AWS credentials stored as GitHub secrets

### Access Control

- **IAM Roles**: Least-privilege access for AWS resources
- **GitHub Environments**: Environment-specific access controls
- **Branch Protection (WIP)**: Deployment restrictions by branch

## 🛠️ Manual Deployment

1. Navigate to GitHub repository
2. Go to **Actions** tab
3. Select **Manual Infrastructure Management**
4. Click **Run workflow**
5. Configure parameters:
   - Action: `plan`, `apply`, or `destroy`
   - Project: `setup` or `cluster`
   - Environment: `dev` or `default`
6. Click **Run workflow**

## Best Practices

1. **Always create PRs** for infrastructure changes
2. **Review security scan results** before merging
3. **Use environments** for production deployments
4. **Keep secrets updated** and rotate regularly
5. **Fresh deployments**: The pipeline is optimized for temporary AWS accounts and will always deploy both setup and cluster infrastructure

## 📚 Related Documentation

- [Setup Package README](../../packages/setup/README.md)
- [Cluster Package README](../../packages/cluster/README.md)
- [Local Package README](../../packages/local/README.md)
- [Root README](../../README.md)
- [Setup Terraform Action](../actions/setup-terraform/README.md)
- [Setup Node AWS Action](../actions/setup-node-aws/README.md)
- [Nx Documentation](https://nx.dev/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
