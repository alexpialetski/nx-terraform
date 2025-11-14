# Setup Node AWS Composite Action

This lightweight composite action sets up Node.js environment with AWS credentials.

## What it does

1. **Node.js Setup**: Installs Node.js with npm caching enabled
2. **Dependencies**: Installs npm dependencies using `npm ci`
3. **Nx Configuration**: Sets up Nx SHAs for affected commands in CI
4. **AWS Authentication**: Configures AWS credentials with output enabled

## Usage

```yaml
steps:
  - name: Setup Node.js and AWS
    uses: ./.github/actions/setup-node-aws
    with:
      aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
      aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      aws-region: ${{ vars.AWS_REGION }}
```

## Inputs

| Input                   | Description           | Required | Default |
| ----------------------- | --------------------- | -------- | ------- |
| `aws-access-key-id`     | AWS Access Key ID     | Yes      | -       |
| `aws-secret-access-key` | AWS Secret Access Key | Yes      | -       |
| `aws-region`            | AWS Region            | Yes      | -       |
| `node-version`          | Node.js version       | No       | `20`    |

## Outputs

| Output           | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `aws-account-id` | AWS Account ID retrieved from configure-aws-credentials action |
| `aws-region`     | AWS Region being used                                          |
