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

## Behavior

### Output Display

Shows outputs defined in `outputs.tf`:

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

