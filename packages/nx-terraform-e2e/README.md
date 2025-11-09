# nx-terraform-e2e

End-to-end (E2E) tests for the `nx-terraform` plugin. This package validates the complete workflow of creating and using Terraform projects within an Nx workspace.

## Overview

The e2e package contains integration tests that verify:

- The full workspace creation flow using `create-nx-terraform-app`
- Proper installation and configuration of the `nx-terraform` plugin
- Backend project creation and configuration
- Terraform module creation and connection to backend
- Execution of Terraform targets (init, plan, apply)
- State file management and backend configuration

## Structure

```
packages/nx-terraform-e2e/
├── src/
│   ├── create-nx-terraform-app.spec.ts    # E2E tests for workspace creation
│   └── __snapshots__/                     # Jest snapshots for project configurations
├── project.json                            # Nx project configuration
├── jest.config.ts                          # Jest test configuration
└── README.md                               # This file
```

## Test Suites

### create-nx-terraform-app.spec.ts

Tests the end-to-end flow of creating a new Nx workspace using the `create-nx-terraform-app` CLI tool.

**What it tests:**

1. **Workspace Creation**

   - Creates a test workspace using `create-nx-terraform-app`
   - Validates the workspace structure is created correctly

2. **Plugin Installation**

   - Verifies `nx-terraform` package is installed correctly
   - Checks plugin is registered in `nx.json`

3. **Backend Project Validation** (when `backendType` is provided)

   - Verifies `terraform-setup` backend project exists
   - Validates project configuration matches expected structure
   - Uses snapshot testing to ensure consistency

4. **Terraform Module Validation**

   - Verifies `terraform-infra` module is created
   - When `backendType` is provided: Validates it's a stateful module connected to `terraform-setup` backend
   - When `backendType` is not provided: Validates it's a simple module without backend connection
   - Checks project type is `application`

5. **Terraform Target Execution**
   - Tests `terraform-apply` target execution
   - Validates Terraform state file creation
   - Verifies backend configuration file exists and has correct content

**Test Flow:**

```typescript
1. Create test project with --backendType=local
2. Verify nx-terraform package installation
3. Check terraform-setup project configuration (snapshot)
4. Verify terraform-infra module exists and is connected
5. Run terraform-apply target
6. Verify terraform.tfstate file exists
7. Verify backend.config file has correct path
```

## Running Tests

### Run All E2E Tests

```bash
nx run nx-terraform-e2e:e2e
```

### Run with Specific Backend Type

The tests create a workspace with the optional `--backendType` option. Currently tested:

- `local` - Local backend with state files (creates backend + stateful module)
- No `backendType` - Creates simple module only (no backend project)

### Update Snapshots

If project structure changes, update snapshots:

```bash
nx run nx-terraform-e2e:e2e --updateSnapshot
```

## Test Environment

- **Test Directory**: Tests create temporary workspaces in `tmp/test-project/`
- **Cleanup**: Temporary test projects are automatically cleaned up after tests complete
- **Dependencies**: Requires `nx-terraform` and `create-nx-terraform-app` packages to be built first

## Dependencies

The e2e package has implicit dependencies on:

- `nx-terraform` - The main plugin package
- `create-nx-terraform-app` - The CLI tool for workspace creation

These are defined in `project.json`:

```json
"implicitDependencies": ["nx-terraform", "create-nx-terraform-app"]
```

The e2e target runs with `dependsOn: ["^build"]` to ensure dependencies are built before tests run.

## Snapshots

Snapshots are stored in `src/__snapshots__/` and capture the complete project configuration output from `nx show project`. This ensures that:

- Project structure remains consistent
- Target configurations match expected values
- Metadata and dependencies are correct

### Snapshot Structure

Snapshots contain the full JSON output of `nx show project terraform-setup --json`, including:

- Project configuration (`root`, `sourceRoot`, `projectType`)
- All Terraform targets (`terraform-init`, `terraform-plan`, `terraform-apply`, etc.)
- Target dependencies, inputs, outputs, and caching configuration
- Project metadata and tags

## Continuous Integration

E2E tests run as part of the CI pipeline to ensure:

- New changes don't break workspace creation
- Plugin integration works end-to-end
- Generated projects have correct structure and targets

## Maintenance

### Adding New Tests

When adding new E2E tests:

1. Add test cases to `create-nx-terraform-app.spec.ts`
2. Update snapshots if project structure changes
3. Ensure cleanup logic handles all temporary files

### Updating Snapshots

When project structure or target configurations change:

1. Run tests to see snapshot mismatches
2. Review changes to ensure they're intentional
3. Update snapshots with `--updateSnapshot` flag
4. Commit updated snapshots with the code changes

### Test Isolation

Each test run:

- Creates a fresh workspace in `tmp/test-project/`
- Cleans up the test directory after completion
- Uses isolated environment to avoid conflicts

## Related Documentation

- [Main Plugin README](../../nx-terraform/README.md) - Plugin features and usage
- [Preset Generator README](../../nx-terraform/src/generators/preset/README.md) - Preset generator details
- [Create App README](../../create-nx-terraform-app/README.md) - CLI tool documentation

## Troubleshooting

### Tests Fail with "Cannot find module"

Ensure dependencies are built:

```bash
nx run nx-terraform:build
nx run create-nx-terraform-app:build
```

### Snapshot Mismatches

If snapshots don't match:

1. Verify the changes are intentional
2. Run with `--updateSnapshot` to update
3. Review diff to ensure correctness

### Test Timeout

E2E tests may take longer because they:

- Create real workspaces
- Execute Terraform commands
- Perform file system operations

Increase timeout if needed in `jest.config.ts`.
