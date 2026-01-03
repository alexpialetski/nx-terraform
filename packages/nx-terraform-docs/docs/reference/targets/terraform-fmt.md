---
sidebar_position: 6
---

# terraform-fmt Target

Formats Terraform configuration files according to Terraform's standard formatting conventions.

## Usage

```bash
nx run my-project:terraform-fmt
```

## Description

The `terraform-fmt` target formats your Terraform files by:

- Standardizing indentation
- Aligning equals signs
- Fixing spacing
- Ensuring consistent formatting

## Dependencies

None - formatting doesn't require initialization.

## Behavior

### Formatting Rules

The formatter applies:
- Consistent indentation (2 spaces)
- Proper spacing around operators
- Aligned equals signs in blocks
- Standardized block formatting

### File Modification

By default, `terraform-fmt` modifies files in place. To check without modifying:

```bash
nx run my-project:terraform-fmt -- -check
```

### Recursive Formatting

Formats all `.tf` files in the project directory recursively.

## Caching

- **All Projects**: ✅ Cached (deterministic formatting operation)

## Examples

### Basic Formatting

```bash
nx run my-infra:terraform-fmt
```

### Check Formatting (No Changes)

```bash
nx run my-infra:terraform-fmt -- -check
```

### Format Specific Files

```bash
nx run my-infra:terraform-fmt -- main.tf variables.tf
```

## Common Use Cases

- **Code consistency**: Maintain consistent formatting
- **Pre-commit hooks**: Format before committing
- **CI/CD checks**: Ensure formatted code
- **Team standards**: Enforce formatting standards

## Related Targets

- **terraform-validate**: Validate after formatting

## Notes

- Formatting is deterministic (same input = same output)
- Results are cached when files haven't changed
- Use `-check` in CI to verify formatting without modifying files
- Formatting doesn't require Terraform initialization

