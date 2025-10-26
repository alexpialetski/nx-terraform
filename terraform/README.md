# Nx Terraform Plugin (`terraform`)

First-class Terraform workflow integration for Nx workspaces: deterministic plans, artifactized outputs, stale plan protection, formatting, validation, and output export.

## Quick Start

1. Install (from this workspace or published package):
   ```bash
   pnpm add -D terraform  # (adjust name/registry once published)
   ```
2. Add a Terraform project (manual for now):
   ```bash
   mkdir -p packages/infra && cd packages/infra
   cat > main.tf <<'EOF'
   terraform {
   	 required_providers { null = { source = "hashicorp/null" version = ">= 3.0.0" } }
   }
   resource "null_resource" "example" {}
   output "example_id" { value = null_resource.example.id }
   EOF
   ```
3. Define targets in `packages/infra/project.json` (example):
   ```jsonc
   {
     "name": "infra",
     "$schema": "../../node_modules/nx/schemas/project-schema.json",
     "root": "packages/infra",
     "targets": {
       "tf-init": { "executor": "terraform:terraform-init", "options": { "env": "dev" } },
       "tf-plan": { "executor": "terraform:terraform-plan", "options": { "env": "dev", "meta": true } },
       "tf-apply": { "executor": "terraform:terraform-apply", "options": { "env": "dev" } },
       "tf-output": { "executor": "terraform:terraform-output", "options": { "env": "dev" } },
       "tf-fmt": { "executor": "terraform:terraform-fmt" },
       "tf-validate": { "executor": "terraform:terraform-validate" }
     }
   }
   ```
4. Run lifecycle:
   ```bash
   nx run infra:tf-init
   nx run infra:tf-plan
   nx run infra:tf-apply   # fails if plan is stale
   nx run infra:tf-output  # writes outputs.json & outputs.env
   ```

## Artifact Layout

Generated plan + metadata are stored under:

```
.nx/terraform/<project>/<env>/<hash>/
	tfplan
	plan.json
	plan.meta.json   # { hash, createdAt, terraformVersion, fileCount, durationMs }
	summary.json     # action counts + sensitiveOutputs
	outputs.json     # from terraform-output (after apply)
	outputs.env      # redacted .env style (unless allowSensitive)
```

`hash` derives from tracked Terraform sources + tfvars + env + lock file.

## Stale Plan Guard

`terraform-apply` recomputes the current hash; if it differs from the plan's `plan.meta.json` hash it fails with a stale warning unless `--force` is passed.

## Executors (Implemented)

| Executor           | Purpose                         | Cacheable | Notes                                          |
| ------------------ | ------------------------------- | --------- | ---------------------------------------------- |
| terraform-init     | Initialize backend/providers    | Yes       | Creates workspace if strategy derive/explicit. |
| terraform-plan     | Deterministic plan + artifacts  | Yes       | Return `changed` (exit code 2).                |
| terraform-apply    | Apply prior plan w/ stale guard | No        | `--force` bypasses guard.                      |
| terraform-output   | Export outputs (JSON + env)     | Yes       | Masks sensitive unless `allowSensitive`.       |
| terraform-fmt      | Format Terraform files          | Yes       | `--check` surfaces needed formatting.          |
| terraform-validate | `terraform validate`            | Yes       | Runs lightweight init unless `--noInit`.       |

## Named Inputs (recommended)

Add to root `nx.json` if not already present:

```jsonc
"namedInputs": {
	"terraform-files": ["{projectRoot}/**/*.tf", "{projectRoot}/tfvars/**/*", "{projectRoot}/modules/**/*", "{projectRoot}/templates/**/*"],
	"terraform-env": [],
	"terraform-all": ["terraform-files", "terraform-env"]
}
```

Then set `inputs` for plan/fmt/validate targets to leverage caching accuracy.

## Outputs Consumption

After `nx run infra:tf-output` you can source `outputs.env` in scripts:

```bash
set -a
source .nx/terraform/infra/dev/<hash>/outputs.env
set +a
```

## Roadmap (Next)

- Destroy & Drift executors
- Sensitivity heuristic (pattern-based)
- Init workspace generator
- Hash determinism + outputs consumer e2e

## Development

- Build: `nx build terraform`
- Test: `nx test terraform`
- Local publish (verdaccio): `nx run @terraform/source:local-registry`

## Contributing

Keep executors minimal & composable. Avoid embedding provider-specific logic; favor generic Terraform semantics.

## License

MIT (pending final licensing decision for the monorepo).
