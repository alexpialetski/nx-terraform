---
sidebar_position: 5
---

# terraform-validate Target

Validates Terraform configuration files for syntax errors and configuration issues.

## Usage

```bash
nx run my-project:terraform-validate
```

## Description

The `terraform-validate` target validates your Terraform configuration by:

- Checking syntax errors
- Validating configuration structure
- Verifying provider requirements
- Checking variable references

## Dependencies

- **terraform-init**: Must run before `terraform-validate` (to download providers)

## Behavior

### Validation Checks

The validator checks for:
- Syntax errors in `.tf` files
- Invalid configuration blocks
- Missing required attributes
- Type mismatches
- Invalid variable references

### Output

On success:
```
Success! The configuration is valid.
```

On failure:
```
Error: <error message>
```

## Caching

- **All Projects**: ✅ Cached (safe operation, results cached when inputs unchanged)

## Examples

### Basic Validation

```bash
nx run my-infra:terraform-validate
```

### Validation After Changes

```bash
# Make changes
# Edit main.tf

# Validate
nx run my-infra:terraform-validate
```

## Common Use Cases

- **Pre-commit checks**: Validate before committing
- **CI/CD validation**: Validate in CI pipelines
- **Development workflow**: Validate during development
- **Quality assurance**: Ensure configuration correctness

## Related Targets

- **terraform-init**: Must run before `terraform-validate`
- **terraform-fmt**: Format code before validation

## Notes

- Validation requires providers to be downloaded (via `terraform-init`)
- Validation is a safe operation (doesn't modify infrastructure)
- Results are cached when inputs haven't changed
- Use in CI/CD to catch configuration errors early

