# Nx Plugin E2E Testing Guide (Reference from `e2e-example`)

> Purpose: Provide repeatable patterns and practical checklists for writing high‑signal, low‑flake end‑to‑end tests for the `nx-terraform` plugin (generators + executors) using the conventions observed in the bundled `e2e-example` (which mirrors official Nx plugin tests).

---

## 1. Core Principles

- **Isolate every test run**: Create a fresh throwaway workspace (`newProject(...)`) per `describe` block or per test suite.
- **Assert observable behavior, not implementation**: Check generated files, command outputs, side‑effects inside `dist/`, runtime execution.
- **Prefer official helpers** from `@nx/e2e-utils` over home‑grown shell scripting to reduce flakes.
- **Deterministic uniqueness**: Use `uniqueName(prefix)` for project names to avoid collisions between parallel / cached runs. (Legacy `uniq` helper consolidated into `uniqueName`.)
- **Keep tests fast but realistic**: Build only what you later assert. Avoid over‑generating.
- **Explicit module format / environment** when relevant (CJS vs ESM, watch mode, batch mode) to surface subtle regressions early.

---

## 2. Test Environment Lifecycle

| Phase     | Pattern                                            | Rationale                                                                         |
| --------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Setup     | `beforeAll(() => newProject({ packages: [...] }))` | Creates a temp workspace (acts like `npx create-nx-workspace` inline).            |
| Teardown  | `afterAll(() => cleanupProject())`                 | Ensures temp folders are removed; prevents leaking state between suites.          |
| Isolation | One workspace per top-level `describe`             | Minimizes cross‑test interference, especially with lockfiles and pnpm workspaces. |

### Selecting Packages

For Nx core plugins you pass the list (e.g. `['@nx/node', '@nx/js']`). For `nx-terraform` you will typically include your local plugin package (e.g. `'@proj/terraform'` once published/test-linked) or rely on relative local registry population.

### Package Manager Strategy

- Use `getSelectedPackageManager()` when behavior differs (e.g., lockfile names, workspace protocol semantics).
- Some official tests bias to `pnpm` for stricter workspace handling (e.g., forcing `packageManager: selectedPm === 'npm' ? 'pnpm' : selectedPm`).

---

## 3. Key Utility Functions (from `@nx/e2e-utils`)

| Helper                                  | Use Case                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- | -------------------------- |
| `newProject(opts)`                      | Initialize ephemeral workspace with optional packages / preset.           |
| `cleanupProject()`                      | Remove temp workspace.                                                    |
| `uniqueName(prefix)`                    | Generate collision‑free project names (supersedes legacy `uniq`).         |
| `runCLI(cmd, options?)`                 | Synchronous Nx command (throws on non‑zero exit unless `silenceError`).   |
| `runCLIAsync(cmd)`                      | Async variant; exposes combined output & status.                          |
| `runCommand(cmd)`                       | Arbitrary shell command (npm/pnpm/yarn/node).                             |
| `runCommandUntil(cmd, predicate)`       | Stream long‑running output (e.g., `serve`) until a ready signal appears.  |
| `execSync(...)`                         | Direct Node execution of built artifacts for runtime assertions.          |
| `updateFile(path, content               | mutator)`                                                                 | Write/modify source files. |
| `updateJson(path, (json) => json)`      | Safe structured JSON edits (project.json, tsconfig, package.json).        |
| `checkFilesExist(...paths)`             | Assert files were generated/emitted.                                      |
| `checkFilesDoNotExist(...paths)`        | Assert absence of artifacts.                                              |
| `readJson(path)` / `readFile(path)`     | Inspect build output or config for assertions.                            |
| `waitUntil(predicate, { timeout, ms })` | Poll for eventual consistency (e.g., watch mode rebuild).                 |
| `rmDist()`                              | Clean `dist/` to test rebuild behavior.                                   |
| `tmpProjPath()`                         | Root path to the ephemeral workspace for passing to Node/child processes. |

---

## 4. Naming & Structure Patterns

### 4.1 Directory Layout (Mirroring `e2e-example`)

Official Nx plugin e2e suites colocate every test (and any lightweight helpers) under a single `src/` folder:

```
<plugin>-e2e/
  jest.config.ts
  tsconfig.spec.json
  src/
    <area>-<focus>.test.ts
    utils/ (shared lightweight helpers only)
```

Adopt the same for `terraform-e2e` (all tests under `terraform-e2e/src/`). Avoid parallel `tests/` vs `src/` splits—this reduces broken relative imports, simplifies IDE navigation, and matches upstream maintenance expectations.

### 4.2 File Naming Convention

Use a kebab-case pattern encoding domain + category + focus:

```
terraform-executor-plan.test.ts
terraform-executor-apply.test.ts
terraform-generator-add-project.test.ts
terraform-generator-add-aws-setup.test.ts
terraform-plugin-installation.test.ts
```

Pattern Template:

```
<domain>-<category>-<feature>[ -<extra-scope>].test.ts
```

Where:

- `domain` = terraform (or broader plugin domain if multi-domain suite)
- `category` = executor | generator | plugin | util | watch | packaging
- `feature` = primary subject (plan, apply, add-project, add-aws-setup, hash, outputs, destroy)
- optional `extra-scope` = disambiguator (e.g., `project-config`, `stale-hash`)

### 4.3 Test Intent in Filename

Prefer explicit intent over brevity. Example: `terraform-executor-plan-hash-determinism.test.ts` is clearer than `plan-hash.test.ts`.

### 4.4 One Concern per File

Keep a file focused on a narrow behavior cluster (e.g., stale plan detection lives in the apply executor test) unless setup overlap would dominate runtime; in that case, group logically but document sections with comments.

### 4.5 Helpers Scope

Limit shared helpers to pure operations (scaffolding, artifact discovery, mutation). Avoid burying assertions in helpers—assert directly in the spec for clarity and diff readability.

### 4.6 Parameterization

Use `describe.each` when validating identical executor behavior across permutations (e.g., future provider variants, backend strategies). Keep matrix sizes minimal to control runtime.

### 4.7 Migration Checklist (Applied to `terraform-e2e`)

- [x] Consolidate all existing specs into `src/`
- [x] Rename to `<domain>-<category>-<feature>.test.ts`
- [x] Introduce `src/utils/e2e-helpers.ts` for shared routines
- [x] Add dedicated hash determinism test (`terraform-executor-plan-hash-determinism.test.ts`)
- [x] Add outputs test (`terraform-executor-output.test.ts`)

### 4.8 Avoiding Duplication

If two tests originally covered the same generator (basic + extended), prefer: keep richer one, rename simple one to `*-basic` only if it captures a distinct fast sanity case.

---

- Tests group by functional concern: _generators_, _executors_, _module formats_, _packaging_.
- Use nested `describe` blocks to separate _mode_ variants (e.g., CJS vs ESM, each package manager, mixed modules).
- Parameterize with `describe.each` for matrix testing (see prune-lockfile test across package managers).

---

## 5. File Mutation & Target Injection

Patterns seen:

```ts
updateJson(`libs/my-lib/project.json`, (config) => {
  config.targets['run-node'] = {
    executor: '@nx/js:node',
    options: { buildTarget: 'my-lib:build', watch: false },
  };
  return config;
});
```

- Always read–modify–write JSON through `updateJson` to avoid formatting churn.
- Add new executor targets programmatically; **do not** copy large sample project.json fixtures—keep the delta small.

---

## 6. Command Execution Strategy

| Scenario                               | Preferred API                                                | Reason                            |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| Nx task (build, test, lint)            | `runCLI('build proj')`                                       | Normal Nx invocation.             |
| Long-running watch / serve until ready | `runCommandUntil('serve app', out => out.includes('ready'))` | Avoids race conditions.           |
| Async build you need to await          | `await runCLIAsync('build lib')`                             | Non-blocking with explicit await. |
| Installing deps (pnpm/yarn/npm)        | `runCommand(pmc.install)`                                    | Pass correct pm command.          |
| Runtime behavior of built JS           | `execSync('node dist/...')`                                  | Real Node execution.              |

---

## 7. Assertions & Verification

Checklist:

- [ ] Files exist (`dist/.../index.js`, generated assets, lockfiles, workspace_modules etc.).
- [ ] Absence where required (no `.babelrc` when `--includeBabelRc=false`).
- [ ] Output logs contain success markers (`Done compiling TypeScript files`, `Success!`).
- [ ] JSON fields updated (exports map, paths, version bumps, added targets).
- [ ] Runtime output matches expectations (e.g., server start log, mixed module messages).
- [ ] Batch / task graph messages surface (e.g., `Running 2 tasks with @nx/js:tsc`).

Avoid over‑asserting ephemeral formatting; prefer semantic checks (presence of keys, substrings).

---

## 8. Generator Testing Patterns

1. Generate entity (`generate @nx/js:lib libs/my-lib --bundler=tsc`).
2. Assert scaffolding (source, README, tsconfig path mapping).
3. Optionally mutate the project (add dependency, alter tsconfig, additional entry points).
4. Re-run build/test to validate idempotency and configuration propagation.
5. Test negative → convert non-buildable to buildable (setup-build generator) and assert new capability.

For `nx-terraform` Generators (anticipated examples):

- **Project scaffolder**: check creation of `main.tf`, `variables.tf`, `outputs.tf`, provider block.
- **Environment generator**: verify `tfvars/<env>.tfvars` created and referenced via executor options.
- **Module add generator**: ensure new module directory and integration in root module (e.g., added to `main.tf` with proper source/path). Validate no duplicate insertion.

---

## 9. Executor Testing Patterns

Observed executor flows:

- Build prerequisite before executor that depends on build output (copy-workspace-modules, prune-lockfile, node runtime executors).
- Add target dynamically, then `run proj:target`.
- Verify side effects (copied workspace modules, pruned lockfile inside `dist/`).
- For network/serve processes use `runCommandUntil` + kill with `promisifiedTreeKill`.

For Terraform Executors (planned):
| Executor | Assertions |
|----------|------------|
| `terraform-init` | Creates `.terraform/` dir, downloads provider plugins, writes lock file. |
| `terraform-plan` | Produces plan file (if configured), console output contains `No changes` or resource add summary. |
| `terraform-apply` | State file exists in backend (or local), output variable values printed. |
| `terraform-destroy` | Subsequent plan shows `0 to destroy` or state removed. |
| `terraform-fmt` | Source diff disappears after run (could snapshot hash before/after). |

Use environment isolation by generating a unique working directory per test (e.g., different Terraform workspace names via variable injection or separate project names).

---

## 10. Module System (CJS vs ESM) Lessons

Patterns used to validate interop:

- Convert build target to ESM by editing `project.json` (format) and tsconfig module/target.
- Dynamic `await import()` inside CJS to consume ESM-only packages (`node-fetch`).
- Mixed app referencing both CJS and ESM libraries; build libs first to control order & ensure output formats.

Takeaway for Terraform plugin: If executors output JavaScript (e.g., wrapper scripts), test both module formats if configuration allows optional ESM output.

---

## 11. Packaging & Consumption Tests

Technique:

1. Build library outputs.
2. Create synthetic consumer projects (`test-cjs/`, `test-esm/`) with `package.json` pointing to `file:../dist/libs/your-lib`.
3. Run Node inside those consumer dirs and assert imported symbol behavior.
4. Validate `exports` field correctness (default + additional entry points).

Adaptation for Terraform:

- After `plan`, create a synthetic script that `require()`s or `import()`s generated JSON plan summary (if your executor outputs one) to assert machine-consumable structure.

---

## 12. Lockfile & Dependency Handling

- Parametrize tests across package managers with `describe.each` to ensure executor portability (e.g., `prune-lockfile`).
- Add workspace/file protocol dependencies to simulate real workspace consumption.
- Assert presence of pruned lockfile inside build output to confirm copy/prune behavior.

For Terraform: you might test provider lock file (`.terraform.lock.hcl`) copying or pruning if implementing such an executor.

---

## 13. Incremental / Watch Mode

Pattern:

1. Start watch build with `runCommandUntil('build lib --watch', out => out.includes('Watching for file changes'))`.
2. Mutate source, assets, and package.json version.
3. Poll dist files with `waitUntil` for changes.
4. Kill process.

Apply to Terraform if you build a `terraform-watch` (file changes -> re-plan) executor: Wait for “Plan: X to add” message, mutate variables, wait again.

---

## 14. Batch Execution & Task Graph

- Set `env: { NX_BATCH_MODE: 'true' }` to exercise batch building path.
- Validate aggregated output lines: `Running N tasks with ...` and success summary referencing dependent tasks.
- Useful to catch concurrency & order issues in complex dependency chains.

Terraform adaptation: Batch building could simulate multi-module plan operations if plugin supports orchestrated runs.

---

## 15. Path Alias & Transpiler Edge Cases

- SWC path mapping via `.swcrc` plus `--skipTypeCheck` to ignore TS path mismatch.
- Wildcard path alias test updates `tsconfig.base.json` and uses direct deep import.

For Terraform: Equivalent edge scenario—test relative module source path rewriting or variable file discovery logic.

---

## 16. Project Naming & Directory Conventions

- Directory + name separation: `--name` and `--directory` determine final location vs project identifier.
- Scoped packages (`@my-org/lib`) allowed and used verbatim as folder name when no directory given.

For Terraform: Support nested module directories (`modules/network`, `environments/dev`) — test generator respects both scoped naming (if any) and directory structure.

---

## 17. Negative & Regression Tests

Examples:

- Attempt build of non-buildable lib → expect throw → convert via setup generator → expect success.
- Remove `tslib` to validate legacy behavior for `importHelpers`.
- Ensure existing dependency versions (e.g., pinned `jest`) are not overridden.

Terraform Candidates:

- Missing backend config should cause `plan` to fail → after running setup generator, succeeds.
- Invalid variable reference triggers failure; generator adding variable resolves it.

---

## 18. Jest Configuration Insights

Key aspects from `jest.config.ts`:

- `maxWorkers: 1` reduces flakiness and resource contention (esp. for build-heavy tests).
- `globalSetup` / `globalTeardown` for shared test registry or environment bootstrapping.
- E2E preset centralizes ts-jest transform + path mappings; replicate pattern for plugin-level common config.

Recommendation: Provide a `jest.preset.e2e.js` for `nx-terraform` E2E with:

- Extended timeout.
- Serialized workers.
- Optional environment variables for AWS mocks.

---

## 19. Timeouts & Stability

- Long operations use `it(..., 240_000)` or `600_000` for complex multi-step builds/serve flows.
- Ensure Terraform operations (which involve network/AWS) have generous but bounded timeouts (e.g., 600_000 ms) and possibly exponential backoff when polling.

---

## 20. Failure Containment

- Tests that are unstable are marked `xit` with a TODO comment (documenting why). Keep a backlog to revisit.
- Prefer skipping over intermittent red builds that reduce trust in suite.

---

## 21. Authoring a New E2E Test (Template)

```ts
import { newProject, cleanupProject, uniqueName, runCLI, checkFilesExist, updateJson, readJson } from '@nx/e2e-utils';

describe('terraform:plan executor', () => {
  let envProj: string;
  beforeAll(() => {
    newProject({ packages: ['@nx/js', '@proj/terraform'] });
  });
  afterAll(() => cleanupProject());

  it('should generate env and produce a plan', () => {
    envProj = uniqueName('tf-env');
    runCLI(`generate @proj/terraform:environment ${envProj} --region=us-east-1`);

    checkFilesExist(`packages/${envProj}/main.tf`, `packages/${envProj}/variables.tf`);

    const output = runCLI(`run ${envProj}:plan --varFile=tfvars/dev.tfvars`);
    expect(output).toContain('Plan:');
    expect(output).not.toContain('Error:');

    // Optionally inspect parsed plan JSON if executor emits one
    // const plan = readJson(`dist/packages/${envProj}/plan.json`);
    // expect(plan.resource_changes.length).toBeGreaterThan(0);
  }, 600_000);
});
```

---

## 22. Suggested Terraform-Specific Assertions

| Concern          | Assertion Pattern                                                              |
| ---------------- | ------------------------------------------------------------------------------ |
| Backend Setup    | S3 bucket/key referenced in generated `backend.config`.                        |
| State Isolation  | Plan output contains unique workspace naming prefix (e.g., `k3s-cluster-dev`). |
| Tagging Strategy | `grep` generated `main.tf` for standard tags block.                            |
| Variable Wiring  | Changing a tfvar triggers different plan delta (e.g., instance count).         |
| Idempotency      | Second `plan` after `apply` shows `No changes`.                                |
| Destroy Safety   | `destroy` removes state files (local) or empties resource list.                |

---

## 23. Flake Mitigation Techniques

- Serialize high‑cost operations with `maxWorkers:1`.
- Use log markers ("Server ready", "Watching for file changes") instead of arbitrary sleeps.
- Poll file contents with `waitUntil` rather than fixed delays.
- Keep Terraform providers pinned; avoid downloading latest each run if possible (cache between tests in global setup).

---

## 24. Maintenance & Extension

| Task                        | Cadence      | Tooling                                             |
| --------------------------- | ------------ | --------------------------------------------------- |
| Audit skipped tests (`xit`) | Weekly       | Simple grep in CI.                                  |
| Upgrade Nx major version    | On release   | Re-run entire e2e suite; snapshot changed messages. |
| Add new executor            | With feature | Follow Section 9 checklist.                         |
| Add new generator           | With feature | Follow Section 8 checklist, include negative test.  |

---

## 25. Quick Checklist (Copy-Paste Before Writing a Test)

- [ ] Fresh workspace via `newProject`.
- [ ] Unique names with `uniqueName`.
- [ ] Generator executed.
- [ ] Minimal file existence assertions.
- [ ] Target modifications through `updateJson`.
- [ ] Executor invoked (`run project:target`).
- [ ] Output / runtime verified.
- [ ] Edge case or negative path included.
- [ ] Cleaned up (implicitly by `cleanupProject`).
- [ ] Long-running tasks gated by ready log predicate.
- [ ] No brittle sleep-based waits.

---

## 26. Common Pitfalls

| Pitfall                                        | Avoidance                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Race conditions on serve                       | Use `runCommandUntil` with clear output predicate.                      |
| Hard-coded names causing conflicts             | Always wrap with `uniqueName()`.                                        |
| Overly broad assertions on full console output | Assert substrings/semantics only.                                       |
| Flaky dependency versions                      | Pin versions in test setup (e.g., explicitly install expected version). |
| Silent failures when editing JSON              | Always `return config` from `updateJson` mutator.                       |

---

## 27. Next Steps for `nx-terraform`

1. Implement a minimal `terraform-init` executor and write first e2e test verifying `.terraform.lock.hcl` creation.
2. Add environment generator test validating naming/tagging conventions (`tags` block inclusion).
3. Introduce plan/apply/destroy cycle test using a trivial local module (no real cloud cost) before expanding to AWS resources (can mock providers or use `-target` flags for speed).
4. Add negative test: missing backend until setup generator runs.
5. Add batch-style test once multiple terraform project dependencies exist (e.g., shared VPC module + service module).

---

## 28. Glossary

| Term       | Meaning                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| Buildable  | A project that produces a `dist/` output via a build executor.            |
| Batch Mode | Nx optimization running multiple tasks with same executor in one process. |
| Task Graph | Dependency-based scheduling of targets across projects.                   |
| ESM / CJS  | JavaScript module formats (EcmaScript Modules vs CommonJS).               |

---

## 29. Reference Files Consulted

From `e2e-example`: `js-*/*.test.ts`, `js-generators.ts`, `jest.config.ts`, `project.json`, `tsconfig.*`. Patterns directly mapped here.

---

## 30. Executor Abstraction (`runTerraformExecutor`)

The earlier direct-import pattern (manually requiring each executor and crafting a bespoke `ExecutorContext`) has been replaced with a lightweight abstraction provided by `e2e-helpers.ts`.

```ts
import { runTerraformExecutor, uniqueName, ensureTerraformInit } from './utils/e2e-helpers';

it('plans using abstraction', async () => {
  const projectName = uniqueName('tf-plan');
  // (Generator invocation omitted for brevity)
  ensureTerraformInit(projectName);
  const res = await runTerraformExecutor(projectName, 'terraform-plan', {
    env: 'dev',
    workspaceStrategy: 'none',
  });
  expect(res.success).toBe(true);
});
```

### 30.1 Responsibilities

`runTerraformExecutor(projectName, executorFolderName, options)`:

- Lazily loads and caches the built executor from `dist/terraform/src/executors/<executorFolderName>/executor.js`.
- Constructs a minimal context (root, projectName, project root mapping) per invocation.
- Returns the executor's structured result (e.g. `{ success, stale }`).

### 30.2 Minimal Context Contract

Executors currently rely only on:

- `root` (workspace root)
- `projectName`
- `projectsConfigurations.projects[projectName].root`

Extend the helper centrally if an executor begins needing additional context fields.

### 30.3 Hash / Artifact Assertions

Artifact paths under `.nx/terraform/<project>/<env>/<hash>/` are inspected after running the executor. Tests assert environment isolation and (for unchanged sources) stable hash reuse.

### 30.4 Stale Plan & Force Apply Logic

Apply executor semantics via abstraction:

- Unchanged apply after plan: `{ success: true, stale: false }`
- Apply after source mutation without re-plan: `{ success: false, stale: true }`
- Forced apply after mutation (`force:true`): `{ success: true, stale: true }`

### 30.5 Multi-Environment Isolation

Distinct `env` values generate separate artifact directories; `env` participates in hash derivation.

### 30.6 Legacy Direct Pattern Removed

All specs now route through `runTerraformExecutor`; no direct `dist/...` imports remain.

### 30.7 When to Prefer CLI Tests

Add/retain CLI-based tests if validating:

- Task graph & caching semantics
- Affected project detection
- Batch mode behavior

### 30.8 Pros / Cons

| Pros                                       | Cons                                                             |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Eliminates repetitive context boilerplate  | Bypasses full project graph & caching behavior                   |
| Central upgrade point for future context   | Requires build step before invocation (`nx run terraform:build`) |
| Direct structured results (no log parsing) | Slight divergence from real CLI runtime path                     |

Mitigation: Periodic CLI smoke tests if executor surface widens.

## 31. Updated Migration & Coverage Checklist (2025-10-26)

Current status:

- [x] Stale plan detection coverage (apply executor test)
- [x] Force apply coverage (`terraform-executor-apply-force.test.ts`)
- [x] Multi-environment plan isolation (`terraform-executor-plan-multi-env.test.ts`)
- [x] Centralized Terraform init logic (`ensureTerraformInit`)
- [x] Removal of redundant manual scaffolding helper
- [x] Hash determinism focused test (`terraform-executor-plan-hash-determinism.test.ts`)
- [x] Outputs consumer test (`terraform-executor-output.test.ts`)
- [x] Executor abstraction (`runTerraformExecutor`) adopted globally
- [x] Unique naming helper consolidation (`uniqueName`)
- [ ] (Future) Re-enable network/npm installation tests under env guard

### 31.1 Skipped / Deferred Tests

Currently skipped for deterministic CI:

- `terraform-plugin-installation.test.ts`
- `terraform.spec.ts`

Re-enable pattern:

```ts
const runNetwork = process.env.RUN_NETWORK_E2E === '1';
(runNetwork ? describe : describe.skip)('terraform plugin installation', () => {
  /* ... */
});
```

Opt-in locally: `RUN_NETWORK_E2E=1 npx nx test terraform-e2e`.

## 32. Changelog

| Date       | Change                                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-10-26 | Added executor abstraction (Section 30); updated checklist (Section 31) marking hash determinism & outputs tests complete; consolidated naming helper; documented skip strategy for network tests. |

### Final Note

Use this as a living document—update when adding new executor capabilities or when Nx testing utilities evolve. Prioritize **signal**, **stability**, and **clarity** while balancing realism (CLI flows) against speed (direct executor invocation where justified).
