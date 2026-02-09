---
sidebar_position: 10
---

# CI/CD Integration

Learn how to integrate nx-terraform into your CI/CD pipelines for automated infrastructure deployments.

## Overview

Integrating nx-terraform with CI/CD enables:
- **Automated validation** - Catch errors before manual review
- **Consistent deployments** - Same process every time
- **Faster feedback** - Know immediately if changes break infrastructure
- **Audit trail** - Track who deployed what and when
- **Environment promotion** - Deploy to dev → staging → prod automatically

## General Principles

### Use Nx Configurations for Environments

Define environment-specific var files in `project.json` using **configurations** (e.g. `dev`, `staging`, `prod`) with `options.args` and `-var-file`. In CI/CD, select the environment with `--configuration=<env>` instead of passing `-var-file` on the command line.

**In project.json** (per Terraform project):

```json
"targets": {
  "terraform-plan": {
    "options": {
      "args": ["-var-file=tfvars/dev.tfvars"]
    },
    "configurations": {
      "staging": { "args": ["-var-file=tfvars/staging.tfvars"] },
      "prod": { "args": ["-var-file=tfvars/prod.tfvars"] }
    }
  },
  "terraform-destroy": {
    "options": { "args": ["-var-file=tfvars/dev.tfvars"] },
    "configurations": {
      "staging": { "args": ["-var-file=tfvars/staging.tfvars"] },
      "prod": { "args": ["-var-file=tfvars/prod.tfvars"] }
    }
  }
}
```

**In CI/CD:**

```bash
# Plan for a specific environment
npx nx run my-infra:terraform-plan --configuration=prod

# Apply for a specific environment (plan must be run with same configuration first)
npx nx run my-infra:terraform-apply --configuration=prod
```

This keeps environment selection in one place and avoids ad-hoc `-var-file` flags in pipelines. See the [Configuration guide](/docs/guides/configuration) for details.

### Validation in CI, Deployment with Control

**Always run in CI:**
- `terraform-validate` - Catch syntax errors
- `terraform-fmt --check` - Enforce code formatting
- `terraform-plan` - Review what will change

**Control deployment execution:**
- **Dev/Staging**: Can auto-apply after approval
- **Production**: Require manual approval or trigger

### State Management

- **Use remote backends** (AWS S3) - State stored remotely, not in CI
- **Enable state locking** - Prevent concurrent modifications
- **Never commit state files** - Always use remote state

### Credentials Management

- **Use CI/CD secrets** - Store credentials securely
- **IAM roles** (AWS) - Prefer over access keys when possible
- **Least privilege** - Grant only necessary permissions
- **Rotate credentials** - Regularly update access keys

## GitHub Actions

### Basic Workflow

```yaml
name: Terraform CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for Nx affected commands

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Format check
        run: npx nx run-many --target=terraform-fmt --all

      - name: Validate
        run: npx nx run-many --target=terraform-validate --all

      - name: Plan
        run: npx nx affected --target=terraform-plan --base=origin/main
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

### Multi-Environment Workflow

```yaml
name: Terraform Deployment
on:
  push:
    branches: [main]

jobs:
  # Validate and plan for all environments
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: hashicorp/setup-terraform@v3

      - name: Install dependencies
        run: npm ci

      - name: Plan ${{ matrix.environment }}
        run: npx nx run ${{ matrix.environment }}-infra:terraform-plan --configuration=${{ matrix.environment }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Save plan
        run: |
          mkdir -p plans
          cp packages/${{ matrix.environment }}-infra/.terraform/tfplan plans/${{ matrix.environment }}.tfplan

      - name: Upload plan
        uses: actions/upload-artifact@v4
        with:
          name: tfplan-${{ matrix.environment }}
          path: plans/${{ matrix.environment }}.tfplan

  # Auto-deploy to dev
  deploy-dev:
    needs: plan
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Install dependencies
        run: npm ci

      - name: Apply to dev
        run: npx nx run dev-infra:terraform-apply --configuration=dev
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  # Deploy to staging with manual approval
  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: staging  # Configure environment protection rules
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Install dependencies
        run: npm ci

      - name: Apply to staging
        run: npx nx run staging-infra:terraform-apply --configuration=staging
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  # Deploy to prod with manual approval
  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Configure environment protection rules with approvers
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Install dependencies
        run: npm ci

      - name: Apply to production
        run: npx nx run prod-infra:terraform-apply --configuration=prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_PROD_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_PROD_SECRET_ACCESS_KEY }}
```

### Nx Affected Optimization

Only run Terraform operations for changed projects:

```yaml
- name: Validate affected projects
  run: npx nx affected --target=terraform-validate --base=origin/main --head=HEAD

- name: Plan affected projects
  run: npx nx affected --target=terraform-plan --base=origin/main --head=HEAD
```

### PR Comments with Plan Output

```yaml
name: Terraform Plan PR Comment
on:
  pull_request:
    branches: [main]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Install dependencies
        run: npm ci

      - name: Terraform Plan
        id: plan
        run: |
          npx nx affected --target=terraform-plan --base=origin/main > plan.txt
        continue-on-error: true
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Comment PR with plan
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Terraform Plan\n\`\`\`\n${plan}\n\`\`\``
            });
```

## GitLab CI

### Basic Pipeline

```yaml
# .gitlab-ci.yml
image: node:20

stages:
  - validate
  - plan
  - deploy

variables:
  TF_VERSION: "1.6.0"

before_script:
  - npm ci
  - wget https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
  - unzip terraform_${TF_VERSION}_linux_amd64.zip
  - mv terraform /usr/local/bin/
  - terraform --version

terraform:validate:
  stage: validate
  script:
    - npx nx run-many --target=terraform-validate --all
  only:
    - merge_requests
    - main

terraform:plan:
  stage: plan
  script:
    - npx nx affected --target=terraform-plan --base=origin/main
  artifacts:
    paths:
      - packages/*/terraform.tfplan
    expire_in: 1 week
  only:
    - merge_requests
    - main

deploy:dev:
  stage: deploy
  script:
    - npx nx run dev-infra:terraform-apply --configuration=dev
  environment:
    name: dev
  only:
    - main

deploy:prod:
  stage: deploy
  script:
    - npx nx run prod-infra:terraform-apply --configuration=prod
  environment:
    name: production
  when: manual
  only:
    - main
```

### Multi-Environment with Dynamic Environments

```yaml
.deploy_template: &deploy_template
  stage: deploy
  script:
    - npx nx run ${ENV}-infra:terraform-apply --configuration=${ENV}
  environment:
    name: $ENV

deploy:dev:
  <<: *deploy_template
  variables:
    ENV: dev
  only:
    - main

deploy:staging:
  <<: *deploy_template
  variables:
    ENV: staging
  when: manual
  only:
    - main

deploy:prod:
  <<: *deploy_template
  variables:
    ENV: prod
  when: manual
  only:
    - main
```

## Azure DevOps

### Pipeline YAML

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: terraform-credentials  # Variable group with AWS credentials

stages:
  - stage: Validate
    jobs:
      - job: ValidateTerraform
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - task: TerraformInstaller@0
            inputs:
              terraformVersion: '1.6.0'

          - script: npx nx run-many --target=terraform-validate --all
            displayName: 'Validate Terraform'

          - script: npx nx run-many --target=terraform-fmt --all -- -check
            displayName: 'Check formatting'

  - stage: Plan
    dependsOn: Validate
    jobs:
      - job: PlanInfrastructure
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - task: TerraformInstaller@0
            inputs:
              terraformVersion: '1.6.0'

          - script: |
              npx nx affected --target=terraform-plan --base=origin/main
            displayName: 'Plan affected projects'
            env:
              AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
              AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)

  - stage: DeployDev
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployToDevEnvironment
        environment: dev
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: NodeTool@0
                  inputs:
                    versionSpec: '20.x'
                - script: npm ci
                  displayName: 'Install dependencies'
                - task: TerraformInstaller@0
                  inputs:
                    terraformVersion: '1.6.0'
                - script: |
                    npx nx run dev-infra:terraform-apply --configuration=dev
                  displayName: 'Apply to dev'
                  env:
                    AWS_ACCESS_KEY_ID: $(AWS_ACCESS_KEY_ID)
                    AWS_SECRET_ACCESS_KEY: $(AWS_SECRET_ACCESS_KEY)

  - stage: DeployProd
    dependsOn: DeployDev
    jobs:
      - deployment: DeployToProdEnvironment
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self
                - task: NodeTool@0
                  inputs:
                    versionSpec: '20.x'
                - script: npm ci
                  displayName: 'Install dependencies'
                - task: TerraformInstaller@0
                  inputs:
                    terraformVersion: '1.6.0'
                - script: |
                    npx nx run prod-infra:terraform-apply --configuration=prod
                  displayName: 'Apply to production'
                  env:
                    AWS_ACCESS_KEY_ID: $(AWS_PROD_ACCESS_KEY_ID)
                    AWS_SECRET_ACCESS_KEY: $(AWS_PROD_SECRET_ACCESS_KEY)
```

## Jenkins

### Jenkinsfile

```groovy
pipeline {
    agent any

    environment {
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        TF_VERSION            = '1.6.0'
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh """
                    wget https://releases.hashicorp.com/terraform/\${TF_VERSION}/terraform_\${TF_VERSION}_linux_amd64.zip
                    unzip terraform_\${TF_VERSION}_linux_amd64.zip
                    sudo mv terraform /usr/local/bin/
                """
            }
        }

        stage('Validate') {
            steps {
                sh 'npx nx run-many --target=terraform-validate --all'
                sh 'npx nx run-many --target=terraform-fmt --all -- -check'
            }
        }

        stage('Plan') {
            steps {
                sh 'npx nx affected --target=terraform-plan --base=origin/main'
            }
        }

        stage('Deploy to Dev') {
            when {
                branch 'main'
            }
            steps {
                sh 'npx nx run dev-infra:terraform-apply --configuration=dev'
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                sh 'npx nx run prod-infra:terraform-apply --configuration=prod'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## Nx Cloud Integration

Nx Cloud provides distributed caching across your team and CI/CD.

### Setup

```bash
# Connect to Nx Cloud
npx nx connect

# Or create account
npx nx connect-to-nx-cloud
```

### Benefits in CI/CD

1. **Distributed Caching** - Cache shared across CI runs and developers
2. **Faster Builds** - Reuse validation/formatting results
3. **Distributed Task Execution** - Run tasks across multiple agents
4. **Better Analytics** - Visualize pipeline performance

### GitHub Actions with Nx Cloud

```yaml
name: CI with Nx Cloud
on: [push, pull_request]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # Nx Cloud will cache validation/formatting results
      - run: npx nx affected --target=terraform-validate --base=origin/main
        env:
          NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

      - run: npx nx affected --target=terraform-plan --base=origin/main
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
```

## Best Practices

### Security

1. **Never commit credentials** - Use CI/CD secret storage
2. **Use IAM roles** when running on AWS (EC2, ECS, Lambda)
3. **Rotate credentials regularly**
4. **Least privilege** - Grant only necessary permissions
5. **Audit trail** - Enable CloudTrail for AWS operations
6. **Separate credentials per environment** - Don't reuse prod credentials for dev

### State Management

1. **Always use remote backends** in CI/CD
2. **Enable state locking** - Prevent concurrent modifications
3. **Never cache state files** - Always fresh from remote
4. **Backup state** - Enable S3 versioning and cross-region replication

### Workflow

1. **Validate on every PR** - Catch errors early
2. **Plan before apply** - Always review changes
3. **Manual approval for production** - Require human review
4. **Incremental rollout** - Deploy to dev → staging → prod
5. **Automated rollback** - Have a rollback plan
6. **Test in lower environments first** - Don't experiment in production

### Performance

1. **Use `nx affected`** - Only run changed projects
2. **Parallel execution** - Use `--parallel` for independent projects
3. **Cache validation/formatting** - Use Nx Cloud for distributed caching
4. **Optimize plan operations** - Keep projects focused and small
5. **Provider plugin caching** - Set `TF_PLUGIN_CACHE_DIR`

### Monitoring

1. **Log all operations** - Keep audit trail
2. **Notify on failures** - Slack, email, PagerDuty
3. **Track deployment metrics** - Success rate, duration, frequency
4. **Monitor infrastructure changes** - Alert on unexpected changes
5. **Plan review** - Require human review of plans before apply

## Troubleshooting

### "Backend initialization failed"

**Cause:** Backend credentials not available in CI.

**Solution:** Configure credentials as CI secrets:
```yaml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### "State lock already acquired"

**Cause:** Previous CI run didn't release lock (crashed or cancelled).

**Solution:** Manually release lock:
```bash
# In AWS DynamoDB console, delete the lock entry
# Or use Terraform force-unlock (use with caution)
terraform force-unlock <lock-id>
```

### "Nx cache not shared between CI runs"

**Cause:** Nx Cloud not configured or token missing.

**Solution:** Set up Nx Cloud and add token to CI secrets:
```yaml
env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
```

### "Plans show unexpected changes on every run"

**Cause:** Timestamps or dynamic values in Terraform.

**Solution:**
1. Use `lifecycle { ignore_changes = [...] }` for dynamic values
2. Ensure consistent Terraform version in CI
3. Pin provider versions

## Related Topics

- [Best Practices](/docs/guides/best-practices) - General best practices
- [Configuration](/docs/guides/configuration) - Configuration management
- [Caching](/docs/guides/caching) - Understanding caching behavior
- [Multiple Environments](/docs/examples/multiple-environments) - Multi-environment setup
