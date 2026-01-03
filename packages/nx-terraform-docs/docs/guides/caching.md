---
sidebar_position: 4
---

# Caching

The nx-terraform plugin uses intelligent caching to speed up your infrastructure workflows. Understanding caching behavior helps you optimize your development and CI/CD pipelines.

## Overview

Caching in nx-terraform varies by:
- **Project Type**: Backend, stateful, or module projects
- **Operation Type**: Safe operations vs state-dependent operations
- **Input Changes**: Cache invalidation based on file changes

## Caching Strategy

### Safe Operations (Cached)

These operations are deterministic and safe to cache:

- **terraform-fmt**: Code formatting is deterministic
- **terraform-validate**: Validation results can be cached when inputs haven't changed

### State-Dependent Operations (Not Cached)

These operations depend on state and cannot be safely cached:

- **terraform-init**: Downloads providers, configures backend (state-dependent)
- **terraform-plan**: Shows infrastructure changes (state-dependent)
- **terraform-apply**: Modifies infrastructure (state-dependent)
- **terraform-destroy**: Destroys infrastructure (state-dependent)
- **terraform-output**: Reads from state (state-dependent)

## Caching by Project Type

### Backend Projects

Backend projects have caching enabled for most operations:

| Target | Cached | Reason |
|-------|--------|--------|
| `terraform-init` | ✅ Yes | Backend projects don't depend on external state |
| `terraform-plan` | ✅ Yes | Can be cached when inputs unchanged |
| `terraform-apply` | ✅ Yes | Can be cached when inputs unchanged |
| `terraform-validate` | ✅ Yes | Safe operation |
| `terraform-fmt` | ✅ Yes | Deterministic formatting |
| `terraform-destroy` | ❌ No | Destructive operation |
| `terraform-output` | ❌ No | Reads from state |

### Stateful Projects

Stateful projects have caching disabled for state-dependent operations:

| Target | Cached | Reason |
|-------|--------|--------|
| `terraform-init` | ❌ No | State-dependent, requires backend access |
| `terraform-plan` | ❌ No | State-dependent, shows infrastructure changes |
| `terraform-apply` | ❌ No | State-dependent, modifies infrastructure |
| `terraform-validate` | ✅ Yes | Safe operation (when inputs unchanged) |
| `terraform-fmt` | ✅ Yes | Deterministic formatting |
| `terraform-destroy` | ❌ No | Destructive operation |
| `terraform-output` | ❌ No | Reads from state |

### Module Projects (Library)

Module projects have caching for validation and formatting:

| Target | Cached | Reason |
|-------|--------|--------|
| `terraform-fmt` | ✅ Yes | Deterministic formatting |
| `terraform-validate` | ✅ Yes | Safe operation |
| `terraform-apply` | ❌ No | Modules typically don't use apply |
| Other targets | ✅ Yes | Stubs (cached but no-op) |

## Cache Inputs

Cache keys are based on:

### File Inputs

- All `.tf` files in the project
- All `.tfvars` files
- `backend.config` (if using remote backend)
- `provider.tf` and provider versions

### Configuration Inputs

- Terraform version
- Provider versions
- Backend configuration
- Environment variables (if used)

### Example Cache Key

```
hash(
  all .tf files,
  all .tfvars files,
  backend.config,
  provider.tf,
  terraform version,
  provider versions
)
```

## Cache Invalidation

Cache is invalidated when:

1. **File Changes**: Any `.tf` or `.tfvars` file changes
2. **Backend Changes**: `backend.config` changes
3. **Provider Changes**: Provider versions change
4. **Terraform Version**: Terraform version changes
5. **Manual Invalidation**: Using `nx reset` or clearing cache

## Cache Benefits

### Development Speed

- **terraform-fmt**: Instant (cached)
- **terraform-validate**: Fast when inputs unchanged
- **Repeated runs**: Skip work when nothing changed

### CI/CD Efficiency

- **Parallel execution**: Multiple projects can use cached results
- **Incremental builds**: Only changed projects run
- **Faster pipelines**: Skip unnecessary work

## Cache Behavior Examples

### Example 1: Formatting (Cached)

```bash
# First run - formats files
nx run my-project:terraform-fmt
# Takes: 2 seconds

# Second run (no changes) - uses cache
nx run my-project:terraform-fmt
# Takes: 0.1 seconds (cache hit)
```

### Example 2: Validation (Cached)

```bash
# First run - validates
nx run my-project:terraform-validate
# Takes: 5 seconds

# Second run (no changes) - uses cache
nx run my-project:terraform-validate
# Takes: 0.1 seconds (cache hit)

# After changing main.tf - cache invalidated
nx run my-project:terraform-validate
# Takes: 5 seconds (cache miss)
```

### Example 3: Plan (Not Cached)

```bash
# Always runs (state-dependent)
nx run my-project:terraform-plan
# Takes: 10 seconds (always)

# State changed externally - different result
nx run my-project:terraform-plan
# Takes: 10 seconds (different plan)
```

## Cache Configuration

### View Cache Status

```bash
# See what's cached
nx show project my-project --json | jq '.targets["terraform-validate"].cache'
```

### Clear Cache

```bash
# Clear all cache
nx reset

# Clear specific project cache
nx reset my-project
```

### Cache Location

Cache is stored in:
```
node_modules/.cache/nx/
```

## Nx Cloud Caching

If using Nx Cloud, caching is distributed:

### Benefits

- **Shared cache**: Team members share cache
- **CI/CD cache**: CI runs use shared cache
- **Faster builds**: Skip work already done by others

### Setup

Connect to Nx Cloud:

```bash
nx connect-to-nx-cloud
```

### Cache Behavior

- Local cache first
- Then check Nx Cloud
- Download if available
- Upload after execution

## Best Practices

### 1. Leverage Cached Operations

- Run `terraform-fmt` frequently (fast when cached)
- Use `terraform-validate` in CI (cached when unchanged)
- Don't skip cached operations (they're fast)

### 2. Understand Cache Invalidation

- Know which operations are cached
- Understand when cache invalidates
- Don't rely on cache for state-dependent operations

### 3. Optimize for Caching

- Keep files organized
- Minimize unnecessary changes
- Use consistent Terraform versions

### 4. CI/CD Optimization

- Use Nx Cloud for distributed caching
- Run cached operations in parallel
- Leverage incremental builds

## Troubleshooting

For caching issues, see the [Troubleshooting Guide](/docs/guides/troubleshooting#caching-issues).

## Related Topics

- [Project Types](/docs/guides/project-types) - Learn about different project types and their caching
- [Targets Reference](/docs/reference/targets/terraform-init) - Detailed target documentation
- [Nx Documentation](https://nx.dev) - General Nx caching information

