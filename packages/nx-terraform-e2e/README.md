# nx-terraform-e2e

End-to-end (E2E) tests for the `nx-terraform` plugin.

## Overview

This package contains integration tests that validate the complete workflow of creating and using Terraform projects within an Nx workspace.

## Running Tests

```bash
nx run nx-terraform-e2e:e2e
```

## Test Coverage

- Workspace creation using `create-nx-terraform-app`
- Plugin installation and configuration
- Backend project creation
- Terraform module creation
- Target execution and state management

For more details, see the test files in `src/`.
