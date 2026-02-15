---
sidebar_position: 7
---

# terraform-output Target

Shows the output values from a Terraform state.

## Usage

```bash
nx run my-project:terraform-output

# Show specific output
nx run my-project:terraform-output -- -json
```

## Description

The `terraform-output` target displays output values defined in your Terraform configuration:

- Shows all outputs from the state
- Displays output values
- Can output in JSON format

## Dependencies

- **terraform-init**: Must run before `terraform-output` (to access state)

## Output format and file (metadata)

The target writes outputs to a file in the project root (default: `terraform-outputs.env`). You can set the format and filename via the **terraform-output** target metadata in `project.json`:

| Option         | Default                   | Description                                                 |
| -------------- | ------------------------- | ----------------------------------------------------------- |
| `outputFormat` | `"tfvars"`                | `"tfvars"` = `key=value`; `"env"` = `KEY=value` (UPPERCASE) |
| `outputFile`   | `"terraform-outputs.env"` | Output filename (relative to project root)                  |

| Format               | `outputFormat`     | Result                                                                                     |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| **tfvars** (default) | omit or `"tfvars"` | `key=value` (original Terraform output names), suitable for `-var-file` or Terraform input |
| **env**              | `"env"`            | `KEY=value` (UPPERCASE keys), suitable for `export` or shell/CI env files                  |

Example — env format and custom file:

```json
{
  "targets": {
    "terraform-output": {
      "metadata": {
        "outputFormat": "env",
        "outputFile": "my-outputs.env"
      }
    }
  }
}
```

If you omit `terraform-output` metadata, the default is `outputFormat: "tfvars"` and `outputFile: "terraform-outputs.env"`.

## Behavior

### Output file

The target runs `terraform output -json` and writes `key=value` (or `KEY=value` when `outputFormat` is `env`) to a file in the project root. The default file is **terraform-outputs.env**; you can override it with `outputFile` in target metadata (see [Output format and file (metadata)](#output-format-and-file-metadata) above).

### Output display (CLI passthrough)

You can pass arguments to the underlying `terraform output` command. Shows outputs defined in `outputs.tf`:

```
Outputs:

vpc_id = "vpc-12345678"
subnet_ids = [
  "subnet-12345678",
  "subnet-87654321"
]
```

### JSON Format

Output in JSON format:

```bash
nx run my-project:terraform-output -- -json
```

### Specific Output

Show a specific output:

```bash
nx run my-project:terraform-output -- vpc_id
```

## Caching

- **All Projects**: ❌ Not cached (reads from state)

## Examples

### Basic Output

```bash
nx run my-infra:terraform-output
```

### JSON Output

```bash
nx run my-infra:terraform-output -- -json
```

### Specific Output

```bash
nx run my-infra:terraform-output -- vpc_id
```

## Common Use Cases

- **View outputs**: See infrastructure outputs
- **CI/CD integration**: Get outputs for other systems
- **Debugging**: Check output values
- **Documentation**: Show infrastructure details

## Related Targets

- **terraform-init**: Must run before `terraform-output`
- **terraform-apply**: Creates outputs (must apply before viewing)

## Notes

- Outputs are read from state
- Requires infrastructure to be applied first
- JSON format is useful for scripting
- Outputs are defined in `outputs.tf`
