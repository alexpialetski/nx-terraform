# Nx Terraform Plugin – Detailed Design Plan

> Iterative design document for a reusable Nx plugin providing first-class Terraform integration. This captures current intent; we will refine as we implement.

## 1. Objectives

- Standardize Terraform workflows (init → plan → apply → destroy) in Nx
- Multi-environment support (tfvars + Terraform workspaces) via Nx configurations
- Deterministic, cache-aware plans and reproducible applies
- Cross-project infrastructure dependency modeling (e.g. backend → cluster)
- Structured artifacts: plan JSON, summaries, outputs env files
- Optional integrations: cost (Infracost), security scan (tfsec), drift detection
- Minimize boilerplate with generators; remain cloud/provider agnostic

## 2. Core Concepts

| Concept      | Description                                                   |
| ------------ | ------------------------------------------------------------- |
| Executor     | Encapsulates a Terraform lifecycle or utility action          |
| Generator    | Scaffolds projects, modules, environments, migration steps    |
| Named Inputs | Hash groups controlling task cache validity                   |
| Artifact     | Generated plan output stored under `.nx/terraform/...`        |
| Environment  | Nx configuration mapping to `tfvars` and optionally workspace |

## 3. Executors (Initial Set)

| Executor                 | Purpose                          | Depends | Cache                  | Key Outputs                                       |
| ------------------------ | -------------------------------- | ------- | ---------------------- | ------------------------------------------------- |
| terraform-init           | Initialize backend/plugins       | —       | Yes                    | `.terraform/`, lock file                          |
| terraform-plan           | Create plan & JSON summary       | init    | Yes                    | `tfplan`, `plan.json`, `summary.json`             |
| terraform-apply          | Apply previously generated plan  | plan    | No (side-effect)       | state change, `outputs.env` (via output executor) |
| terraform-destroy        | Destroy infrastructure           | init    | No                     | —                                                 |
| terraform-fmt            | Format .tf files                 | —       | Yes                    | formatted files                                   |
| terraform-validate       | Validate configuration           | init    | Yes                    | —                                                 |
| terraform-output         | Export outputs to env & JSON     | init    | Yes                    | `outputs.env`, `outputs.json`                     |
| terraform-drift          | Detect drift (plan w/ diff code) | init    | Yes                    | `summary.json`, drift status                      |
| terraform-show           | Convert existing plan to JSON    | plan    | Yes                    | `plan.json`, `summary.json`                       |
| terraform-workspace      | Ensure/select workspace          | —       | Yes (stateful caution) | workspace selection                               |
| terraform-cost (opt)     | Cost diff using Infracost        | plan    | Yes                    | `cost.json`, `cost.txt`                           |
| terraform-sec-scan (opt) | Security scan (tfsec)            | init    | Yes                    | `security.json`, report                           |
| terraform-graph (opt)    | Graph generation                 | init    | Yes                    | `graph.dot`, `graph.svg`                          |

### Executor Shared Options

- `--env` / `--configuration`: Selects environment (maps to tfvars & workspace)
- `--tfDir`: Sub-directory override (for nested modules)
- `--workspaceStrategy`: derive | explicit | none
- `--json`: Machine-readable output
- `--planFile`: override (plan/apply/show)
- `--force`: bypass stale plan guard (apply)

### Plan Hash Inputs

- All tracked Terraform sources (.tf, tfvars, templates, modules)
- Relevant environment variables (`TF_VAR_*`, `TF_WORKSPACE`)
- Terraform version + provider lock file
- Normalized backend config

## 4. Generators

| Generator        | Function                                    | Key Options                                                       |
| ---------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| init-workspace   | Add namedInputs + targetDefaults            | `--addCost` `--addSecurity` `--skipDefaults`                      |
| add-project      | Scaffold Terraform project & `project.json` | `--name` `--envs` `--backend` `--dependsOn` `--inferDependencies` |
| add-env          | Add new tfvars + config entry               | `--project` `--env` `--copyFrom`                                  |
| module           | Create reusable module skeleton             | `--name` `--withTests`                                            |
| migrate-targets  | Convert existing run-commands to plugin     | `--project` `--dryRun`                                            |
| backend-s3       | Scaffold S3 backend pattern                 | `--bucket` `--keyPrefix`                                          |
| outputs-consumer | Generate helper script to source outputs    | `--project`                                                       |

## 5. Named Inputs & Target Defaults

Proposed additions (if absent):

```jsonc
"namedInputs": {
  "terraform-files": ["{projectRoot}/**/*.tf", "{projectRoot}/modules/**/*", "{projectRoot}/templates/**/*", "{projectRoot}/tfvars/**/*"],
  "terraform-env": [ { "env": "TF_WORKSPACE" }, { "env": "TF_VAR_region" }, { "env": "TF_VAR_account_id" } ],
  "terraform-all": ["terraform-files", "terraform-env"]
}
```

Target defaults wire caching similar to existing repo pattern.

## 6. Cross-Project Dependency Strategy

Mechanisms:

1. Explicit `dependsOn`: user-specified
2. Inference heuristics:
   - Detect `backend.config` relative path usage
   - Parse `data "terraform_remote_state"` blocks for bucket/key patterns
3. Graph augmentation plugin emits soft edges (warn if cycles)

## 7. Artifact Layout

```
.nx/terraform/<project>/<env>/<hash>/
  tfplan
  plan.json
  plan.meta.json   # { hash, terraformVersion, createdAt }
  summary.json     # simplified actions counts
  cost.json        # optional
  security.json    # optional
  outputs.env
  outputs.json
```

## 8. Plan Summary Schema

```json
{
  "project": "cluster",
  "environment": "dev",
  "actions": { "create": 3, "update": 1, "delete": 0, "replace": 1 },
  "changes": [
    {
      "address": "aws_instance.node[0]",
      "actions": ["create"],
      "type": "aws_instance"
    }
  ],
  "sensitiveOutputs": ["kubeconfig", "token"],
  "drift": false
}
```

## 9. Multi-Environment Mapping

- Nx `--configuration=dev` → `tfvars/dev.tfvars`
- Terraform workspace auto-created if `workspaceStrategy=derive`
- Validation: fail if tfvars missing unless `--allowImplicitEnv`
- Optional `environments.json` registry (metadata, region, provider constraints)

## 10. Security & Secret Handling

- Redact sensitive outputs to env file unless `--allowSensitive`
- Auto-append recommended ignore entries:

```
.nx/terraform/
**/terraform-outputs.env
**/.terraform/
**/tfplan
```

- Validate no literal credentials within tfvars (heuristic pattern match)

## 11. Hooks & Extensibility

Config file `.terraform-nx.json` example:

```json
{
  "hooks": {
    "preInit": "scripts/check-version.sh",
    "postPlan": "node scripts/annotate-plan.js"
  },
  "integrations": {
    "cost": { "enabled": true, "provider": "infracost" },
    "security": { "enabled": true, "tool": "tfsec" }
  }
}
```

Hook environment variables provided: `NX_PROJECT`, `TF_ENV`, `PLAN_PATH`, `SUMMARY_PATH`.

## 12. Implementation Phases

| Phase | Focus           | Deliverables                                                    |
| ----- | --------------- | --------------------------------------------------------------- |
| 1     | Core lifecycle  | init, plan, apply, destroy, fmt, validate + add-project + docs  |
| 2     | Artifacts & env | summary parsing, outputs export, add-env, module generator      |
| 3     | Advanced        | drift, show, cost, security, graph, migrate-targets             |
| 4     | Polish          | hooks, inferred dependencies, rich terminal UX, tests, examples |

## 13. Testing Strategy

- Unit: Hashing, option translation, plan parsing
- Integration: Ephemeral test modules using `null_resource`
- Golden snapshots: `summary.json` / `plan.json`
- Graph tests: dependency inference accuracy
- CI matrix: Terraform versions (e.g., 1.6, 1.7, 1.8)

## 14. Example Plan Executor Pseudocode

```ts
export default async function plan(options, ctx) {
  const meta = computeInputsHash(...);
  const artifactDir = getArtifactDir(ctx.projectName, options.env, meta.hash);
  await ensureWorkspace(options.env);
  await runTerraform(['init', ...]);
  const code = await runTerraform(['plan','-out', path.join(artifactDir,'tfplan'), ...varArgs]);
  await runTerraform(['show','-json', path.join(artifactDir,'tfplan')], { redirect: 'plan.json' });
  const summary = summarizePlan(path.join(artifactDir,'plan.json'));
  writeJson(path.join(artifactDir,'summary.json'), summary);
  return { success: code === 0 || code === 2, changed: code === 2, hash: meta.hash, summary };
}
```

## 15. Risks & Mitigations

| Risk                     | Mitigation                                   |
| ------------------------ | -------------------------------------------- |
| Stale plan applied       | Embed hash; reject mismatch unless `--force` |
| Drift false positives    | Normalize provider-only diffs                |
| Secret leakage           | Redact by default; explicit override         |
| Cache poisoning          | Include Terraform version + lock hash in key |
| Dependency mis-detection | Soft suggestions + manual override           |

## 16. Documentation Outline

- Quick Start
- Adding a Project
- Environments & Workspaces
- CI Patterns (drift gating, cost diff)
- Migration Guide
- Extensibility (hooks, integrations)
- Security Considerations

## 17. Future Enhancements (Backlog)

- Terraform Cloud remote execution mode
- OPA / policy-as-code executor
- Aggregated multi-project plan dashboard
- Slack / webhook reporters
- Stateful module version audit

## 18. Open Questions (For Iteration)

1. Should cost/security be first-class or optional peer packages?
2. Do we auto-detect provider-specific vars (e.g., AWS region) for hashing?
3. Provide a global lock on simultaneous apply per project?
4. Include localstack integration examples?

## 19. Next Implementation Step (Proposed)

Start Phase 1: Implement inside existing scaffold produced by `npx create-nx-plugin terraform`.

### 19.1 Scaffold Reality Check (Post-Generation Audit)

The generator created a nested workspace at `terraform/` containing:

- Root plugin workspace (name: `@terraform/source`) with its own `nx.json`, `project.json` and dev dependencies (Nx 22.x)
- Library project at `terraform/terraform/` (library name: `terraform`) with empty `src/index.ts`
- No `executors.json` or `generators.json` yet (placeholders expected once we add code)

### 19.2 Architectural Adjustment

Instead of maintaining a nested standalone Nx workspace inside the main monorepo, we have two options:

1. KEEP NESTED (short-term speed): Develop plugin in its generated sub-workspace; publish from there. Pros: faster initial coding. Cons: duplication of Nx version (root repo uses Nx 21.x, plugin uses 22.x).
2. MERGE INTO ROOT (recommended medium-term): Move `terraform/terraform` library into main monorepo `packages/terraform-plugin` (or `tools/plugins/terraform`) to align versions and simplify consumption.

Initial action: Proceed with Option 1 for Phase 1 to minimize refactor friction; schedule migration after core executors stable.

### 19.3 Version Alignment Risk

Root workspace Nx: 21.x (per earlier inspection). Plugin scaffold: 22.0.1. Mixing may cause incompatibility if we attempt to reference plugin executors from root. Mitigation path:

- During Option 1 phase, treat plugin as separately built artifact (local registry publish using `local-registry` target) and install into root workspace for dogfooding.
- Before wider adoption, downgrade plugin scaffold to match root Nx version OR upgrade root workspace intentionally.

### 19.4 Updated Phase 1 Deliverables

Inside `terraform/terraform/` implement:

1. `executors.json` with entries for: `terraform-init`, `terraform-plan` (only two in first commit)
2. Executor source files under `src/executors/<name>/executor.ts` & `schema.json`
3. Shared utilities: `src/utils/{exec.ts,hash.ts,fs.ts,plan-parse.ts}`
4. Add minimal `add-project` generator (stub) to validate plugin wiring later.
5. Add Jest tests: hashing utility & plan summary parser (fixture JSON)
6. Extend `package.json` main to include built executor exports if needed (or rely on assets copy).

### 19.5 Incremental Implementation Order

Step A: Create `executors.json` + init executor (basic `terraform init`, pass-through options).
Step B: Add plan executor with hashing & artifact dir creation (skip parsing initially).
Step C: Introduce plan JSON parsing & summary writer.
Step D: Add test fixtures and unit tests.
Step E: Publish locally (`nx run @terraform/source:local-registry` then `npm publish --registry ...`) & install into root for trial integration (optional early dogfooding).

### 19.6 Hash Strategy Concretized

`hashInputs(projectRoot, env)` algorithm:

1. Collect file list: glob patterns (default: `**/*.tf`, `tfvars/**/*.tfvars`, `templates/**/*`, `modules/**/*`).
2. Compute sha256(content + relativePath) aggregated XOR or concatenated then hashed.
3. Read `.terraform.lock.hcl` if present; include its hash.
4. Capture Terraform version: execute `terraform version -json` (fallback to plain text grep if JSON unsupported) and include.
5. Include filtered environment variables (prefix `TF_VAR_` + `TF_WORKSPACE`).
6. Serialize structure into canonical JSON then hash again for final key.

### 19.7 Artifact Path Function

`getArtifactDir(project, env, hash)` → `.nx/terraform/${project}/${env || 'default'}/${hash}` (NOTE: For nested plugin development, relative to consuming workspace root; when inside plugin sub-workspace use its root). Provide override via `NX_TERRAFORM_ARTIFACT_ROOT` env for advanced CI storage redirection.

### 19.8 Executor Return Contract (JSON mode)

All executors returning structured data will follow:

```json
{
  "success": true,
  "project": "<name>",
  "env": "dev",
  "artifactDir": ".nx/terraform/cluster/dev/<hash>",
  "hash": "<hash>",
  "changed": true, // plan/drift only
  "summaryPath": ".../summary.json", // when applicable
  "planPath": ".../tfplan" // when applicable
}
```

### 19.9 Short-Term TODOS (to be tracked separately)
Status after initial implementation pass (✅ = completed):

- ✅ Add `executors.json`
- ✅ Implement `terraform-init` executor (basic init + optional workspace handling)
- ✅ Implement shared hashing utility (`hashTerraformInputs`)
- ✅ Implement `terraform-plan` (artifact hashing + deterministic directory)
- ✅ Add artifact directory + JSON output + plan summary
- ✅ Add fixtures & Jest tests (hash + plan summary)
- ⏳ Document usage in plugin README (pending)
- ⏳ Decide upgrade vs downgrade Nx versions before integrating into root (pending strategic decision)
- ⏳ Add `add-project` generator (stub planned for next phase)
- ⏳ Implement `terraform-apply` with stale plan guard
- ⏳ Implement `terraform-output` executor
- ⏳ Introduce plan meta file (hash, createdAt, terraformVersion)
- ⏳ Add drift mode (wrap plan) & `terraform-show` reuse

Summary: Core groundwork (init/plan + utilities + tests) complete. Remaining focus shifts to apply/output lifecycle, generators, and integration.

### 19.10 Follow-Up Migration (Planned Post Phase 1)

When merging into root workspace:

1. Move library folder to `packages/nx-terraform/`
2. Consolidate Nx version (upgrade root to 22.x or align plugin downwards)
3. Register plugin via root `nx.json` `plugins` array (if using auto plugin discovery)
4. Replace existing run-command terraform targets with plugin executors in `cluster` and `setup` `project.json`.

---

This adjustment section will evolve as soon as first executors land.

### 19.11 Current Implementation Snapshot

Implemented Components:
- Executors: `terraform-init`, `terraform-plan`
- Utilities: command runner, hashing, artifact path creation, plan summary extraction
- Tests: Deterministic hashing, change sensitivity, environment influence; plan summary counts & sensitive outputs
- Return Contract: `terraform-plan` now emits `{ success, project, env, artifactDir, hash, planPath, summaryPath, changed }`

Not Yet Implemented:
- `terraform-apply`, `terraform-output`, `terraform-destroy`, `terraform-fmt` (plugin versions), `terraform-validate` (plugin version)
- Generators (`add-project`, `init-workspace`, etc.)
- Cost / security / drift / graph advanced executors
- README usage & migration guide
- Plan meta file / stale plan guard enforcement
- Version alignment decision (Nx 21 root vs 22 plugin)

### 19.12 Immediate Next Steps (Proposed Ordering)
1. Implement `terraform-apply` executor:
  - Inputs: planPath (default: discover latest artifact hash for env)
  - Guard: Verify plan hash matches recomputed inputs unless `--force`
  - Output: success + applied hash
2. Implement `terraform-output` executor:
  - Write `outputs.env` and `outputs.json` (redact sensitive values by default)
3. Add lightweight `add-project` generator (scaffold main.tf, variables.tf, outputs.tf, project.json wiring to plugin executors)
4. Add `plan.meta.json` emission in plan executor (include terraformVersion, createdAt ISO timestamp, input file list)
5. Implement `terraform-destroy` using existing patterns (reuse hashing for consistency but mark non-cacheable)
6. Implement `terraform-fmt` & `terraform-validate` executors (wrappers, cacheable)
7. Author plugin README (Quick Start + replacing run-commands example from current repo)
8. Strategy decision: upgrade root Nx to 22.x OR backport plugin to 21.x (document pros/cons)
9. Dogfood: Replace one project (`setup`) targets with plugin executors behind a feature branch.
10. Add drift executor (reusing plan core) and finalize status codes mapping for CI gating.

### 19.13 Risk Adjustments After Progress
- Hash correctness validated in tests → residual risk: large module trees performance (mitigation: future incremental hash caching)
- Summary parse stable for basic actions → need extended test coverage for complex replace chains & moved resources
- Version skew risk increased as more executors rely on devkit APIs; prioritize alignment before broad adoption.

### 19.14 Metrics to Add Later
- Plan execution duration capture (ms) in `plan.meta.json`
- File count hashed
- Changed flag rationale (counts of create/update/delete/replace)

### 19.15 Definition of Done for Next Milestone
- Apply & Output executors implemented + tested
- One generator (`add-project`) functional
- Documentation (README Quick Start) drafted
- Root workspace can successfully run `nx run cluster:terraform-plan` via plugin on a feature branch
- Decision recorded for Nx version alignment

---

_Provide feedback on structure, missing concerns, or preferred priority adjustments. We'll refine before coding Phase 1._

## 20. Progress Update (2025-10-26)

### 20.1 Newly Completed Since Original Plan

| Area | Accomplishment |
|------|----------------|
| Executors | Implemented `terraform-apply` with stale plan hash guard (auto-discovers latest plan; rejects mismatch unless `--force`, test exercises mismatch) |
| Executors | Enhanced `terraform-plan` to emit `plan.meta.json` (hash, terraformVersion, createdAt, durationMs, fileCount, summary & plan relative refs) |
| Generators | Added `add-terraform-project` (generic, multi-env tfvars, provider selection, env-aware target configurations) |
| Generators | Upgraded `add-aws-setup` to use real `terraform:terraform-apply` executor (replacing placeholder run-commands) |
| Tests (E2E) | Added comprehensive plan artifact test (validates `tfplan`, `plan.json`, `summary.json`, `plan.meta.json`) |
| Tests (E2E) | Added apply lifecycle test (plan → apply → mutate → stale detection → re-plan → apply) including dynamic removal of `dependsOn` to simulate stale scenario |
| Tests (E2E) | Generator coverage: duplicate generation advisory, project configuration assertions, environment tfvars presence |
| Hashing/Artifacts | Validated deterministic hash & artifact layout across multiple ephemeral projects; confirmed metadata and summary emission |

### 20.2 Adjusted Remaining Scope

The following items move from "planned" to "remaining" with clarified acceptance criteria:

1. terraform-output executor
  - Reads current state outputs (after apply) using `terraform output -json`.
  - Produces `outputs.json` (raw JSON) and `outputs.env` (KEY=VALUE, redacting sensitive unless `--allowSensitive`).
  - Writes into the existing artifact directory of the most recent matching plan hash (or creates a new hashless timestamped directory if no plan context available).
2. terraform-destroy executor
  - Non-cacheable; uses `-auto-approve`.
  - Optionally validates there is no unapplied newer plan hash (informational warning).
3. terraform-fmt / terraform-validate executors
  - Cacheable with namedInputs: `terraform-files`.
  - Return structured `{ success, formattedChangedCount }` (fmt) and `{ success }` (validate).
4. Drift executor
  - Reuses plan logic with a `--drift` flag; marks `summary.drift = true` only when resources show changes with no local file modifications (initial heuristic: compare current hash vs plan.meta hash; if equal but plan exit code=2 → drift).
5. Output redaction policy
  - Implement basic sensitivity heuristic (keys containing `token|secret|password|key|cert` case-insensitive) added to plan summary `sensitiveOutputs`.
6. README / Documentation
  - Quick Start (init → plan → apply), artifact reference, stale plan guard explanation, adding environments, migrating from run-commands.
7. Version alignment decision
  - Draft a short ADR: Option A upgrade root to Nx 22; Option B backport plugin to Nx 21. Include test matrix implications.
8. Dogfooding
  - Replace `setup` & `cluster` project terraform targets with plugin executors on a feature branch; ensure CI viability.
9. add-project / init-workspace generators
  - Separate from generic project: an opinionated minimal generator + workspace initializer that injects namedInputs / targetDefaults if absent.
10. terraform-show executor
   - Make existing plan JSON extraction callable standalone (given `--planFile`).
11. Optional integrations scaffolding hooks
   - Stub config in `.terraform-nx.json` & no-op hooks for future cost/security.

### 20.3 Updated Risk Landscape

| Risk | Change | Mitigation |
|------|--------|------------|
| Version skew (Nx 21 vs 22) | Higher impact now that apply executor may be dogfooded | Prioritize ADR + alignment before broad adoption |
| Stale plan false negatives | Reduced: hash guard in place | Add unit test around hash function edge cases (symlink, large module) |
| Test flakiness | One apply test flagged flaky by Nx (replace action) | Pin null_resource trigger or suppress replacement by anchoring a static trigger value; evaluate before CI integration |
| Performance on large repos | Unknown | Future enhancement: incremental hashing cache file per project |

### 20.4 Metrics & Telemetry TODO

- Persist `durationMs` across multiple runs for basic historical baseline (optional future).
- Collect counts of create/update/delete/replace directly in `plan.meta.json` (currently only in `summary.json`).

### 20.5 Immediate Next Session Starting Points

Recommended order to resume:
1. Implement `terraform-output` executor (unblocks env consumption pattern).
2. Implement `terraform-fmt` & `terraform-validate` (quick wins; raise confidence & caching examples).
3. Draft README Quick Start using newly implemented executors.
4. Decide Nx version alignment (write ADR stub) before wiring plugin into root projects.
5. Add destroy & drift executors (drift depends on stable summary semantics).

### 20.6 Current Definition of Done (Revised)

Phase 1 completion now requires (remaining subset):
- Output, fmt, validate, destroy executors implemented + tested.
- README Quick Start + Stale Plan Guard section.
- ADR on version alignment merged.
- Dogfood branch proving plugin targets on at least one project.

### 20.7 Reference: Implemented Artifacts Example

```
.nx/terraform/<proj>/<env>/<hash>/
  tfplan
  plan.json
  plan.meta.json   # includes hash, terraformVersion, durationMs, fileCount
  summary.json
```

`outputs.env` / `outputs.json` will be added once the output executor is implemented.

---
_Progress section appended on 2025-10-26 to guide next implementation session._
