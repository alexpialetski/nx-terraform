# Update Documentation Command

## Purpose
This command examines recent code changes and ensures all README documentation files are up to date with the current implementation.

## Process

### 1. Identify Changed Files
- Check git diff or recent changes to identify modified source files
- Focus on generator files: `*.ts`, `schema.json`, `schema.d.ts`
- Check target files: `targets/*.ts`
- Identify any new generators or removed generators

### 2. Map Changes to Documentation
For each changed file, identify the corresponding README:

**Generator Files:**
- `packages/nx-terraform/src/generators/<generator-name>/<file>.ts` → `packages/nx-terraform/src/generators/<generator-name>/README.md`
- `packages/nx-terraform/src/generators/<generator-name>/schema.json` → Check README for options table

**Plugin Files:**
- `packages/nx-terraform/src/inferedTasks.ts` → `packages/nx-terraform/README.md` (Project Discovery section)
- `packages/nx-terraform/src/targets/*.ts` → `packages/nx-terraform/README.md` (Targets section)
- Plugin root changes → `packages/nx-terraform/README.md`

**CLI Files:**
- `packages/create-nx-terraform-app/bin/index.ts` → `packages/create-nx-terraform-app/README.md`
- `packages/nx-terraform/src/generators/preset/generator.ts` → `packages/create-nx-terraform-app/README.md` (Integration section)

**E2E Test Files:**
- `packages/nx-terraform-e2e/src/*.spec.ts` → `packages/nx-terraform-e2e/README.md`
- `packages/nx-terraform-e2e/src/__snapshots__/*.snap` → `packages/nx-terraform-e2e/README.md` (Snapshot section)
- Changes to preset generator that affect workspace creation → `packages/nx-terraform-e2e/README.md` (may need snapshot updates)

**Root Changes:**
- Any major plugin changes → `README.md` (root)

### 3. Verify Schema Consistency
For each generator, check:

**Schema Options:**
1. Read `schema.json` to get current options
2. Verify README options table matches:
   - Option names
   - Types (string, boolean, etc.)
   - Required status
   - Default values
   - Descriptions
3. Check `schema.d.ts` types match schema.json
4. Verify default values in normalization function match schema descriptions

**Common Checks:**
- `bucketNamePrefix` default: Should be `'terraform-state'` (not `'tf-rs-school-'`)
- `backendType`: Should be `'aws-s3' | 'local'`
- `backendProject`: Should be optional string
- `name`: Should be required string (positional)

### 4. Verify Implementation Details
For each generator README, verify:

**Generator Function:**
- Function signature matches implementation
- Options normalization matches README defaults
- Template directory selection logic matches README
- File generation matches "What It Creates" section

**Code Structure:**
- Template paths are correct
- Normalization logic matches documented defaults
- Error handling matches described behavior
- Dependencies between generators are accurate

### 5. Verify Target Documentation
If targets changed:
- Check `packages/nx-terraform/src/targets/default.ts`
- Verify target names match README
- Verify dependencies match README
- Verify caching strategy matches implementation
- Update both `packages/nx-terraform/README.md` and `.cursorrules`

### 6. Verify Project Discovery
If `inferedTasks.ts` changed:
- Verify project type detection logic matches README
- Verify file patterns match documentation
- Update project type descriptions if needed

### 7. Cross-Reference Consistency
Check for contradictions:
- Same information should match across all READMEs
- Command examples should use correct plugin name: `@nx-terraform/plugin:`
- Default values should be consistent (e.g., `bucketNamePrefix: 'terraform-state'`)
- Backend project name in preset: Should be `'terraform-setup'` everywhere

### 8. Update Documentation
For each discrepancy found:

**Options/Schema Changes:**
- Update README options table
- Update examples to reflect new options
- Update "What It Creates" section if file structure changed

**Implementation Changes:**
- Update "Implementation Details" section
- Update code examples if logic changed
- Update normalization descriptions if defaults changed

**New Features:**
- Add new options to options table
- Add examples showing new features
- Update "When to Use" section if applicable

**Removed Features:**
- Remove deprecated options
- Update examples to remove obsolete patterns
- Note deprecations if applicable

### 9. Verify Documentation Links
- All README files should reference each other correctly
- Paths should be relative and correct
- Generator READMEs should link back to main plugin README
- Root README should link to all generator READMEs
- E2E README should reference preset generator and CLI documentation

### 10. Verify E2E Test Documentation
If E2E tests or preset generator changes:
- Check `packages/nx-terraform-e2e/src/*.spec.ts` for test coverage
- Verify `packages/nx-terraform-e2e/README.md` describes current test scenarios
- Update E2E README if new projects are created by preset (e.g., terraform-infra)
- Note if snapshots need updating when project structure changes
- Verify test flow documentation matches actual test implementation

### 11. Update .cursorrules if Needed
If major structural changes occurred:
- Update project structure diagram
- Update generator documentation references
- Update key concepts sections

## Specific Checks

### terraform-backend Generator
- ✅ Default `bucketNamePrefix` is `'terraform-state'` (not `'tf-rs-school-'`)
- ✅ Schema.json description matches code default
- ✅ README options table matches schema
- ✅ Template directory selection (aws-s3-backend vs local-backend) matches code

### terraform-module Generator
- ✅ `backendType` is always required (even for simple modules)
- ✅ `backendProject` validation logic matches README
- ✅ Project type determination (library vs application) matches code
- ✅ Template directory selection (simple-module vs stateful-module) matches code

### preset Generator
- ✅ Backend project name is hardcoded as `'terraform-setup'`
- ✅ Terraform module name is hardcoded as `'terraform-infra'`
- ✅ Composition (init + terraform-backend + terraform-module) matches README
- ✅ Options are correctly documented
- ✅ Creates stateful module connected to backend project

### init Generator
- ✅ No options (schema should have no properties)
- ✅ Idempotent behavior is documented

## Validation Checklist

After updating documentation:

- [ ] All option tables match schema.json files
- [ ] Default values in code match README documentation
- [ ] Code examples use correct command syntax
- [ ] File structures match "What It Creates" sections
- [ ] Implementation details match actual code
- [ ] Cross-references between READMEs are correct
- [ ] No contradictions between READMEs
- [ ] All generator READMEs are referenced in main plugin README
- [ ] Root README links to all documentation
- [ ] E2E README is up to date with current test scenarios
- [ ] E2E README reflects preset generator behavior (backend + module creation)
- [ ] .cursorrules references are up to date

## Execution Steps

When this command is invoked:

1. **Analyze Changes**: Use git diff or identify modified files
2. **Read Current Documentation**: Read relevant README files
3. **Read Current Code**: Read corresponding source files
4. **Compare**: Identify discrepancies between code and docs
5. **Update**: Make necessary documentation updates
6. **Update E2E README**: If preset generator or workspace creation changed, update e2e README
7. **Verify**: Check for consistency across all documentation
8. **Report**: Summarize what was updated and why

## Notes

- Always preserve the existing documentation structure and style
- Maintain links between README files
- Keep examples practical and up to date
- Ensure command syntax uses correct plugin name: `@nx-terraform/plugin:`
- When preset generator changes, update both preset README and e2e README
- E2E README should reflect what projects are created by the preset generator
- When in doubt, prefer accuracy to brevity - comprehensive docs help users and AI models
