import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  runCLI,
  runTerraformExecutor,
} from './utils/e2e-helpers';

describe('terraform-executor-fmt', () => {
  const projectName = uniqueName('fmtproj');

  beforeAll(() => {
    const root = getWorkspaceRoot();

    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );
    // Intentionally introduce poor formatting (extra spaces, no newline)
    const mainPath = path.join(root, 'packages', projectName, 'main.tf');

    fs.appendFileSync(
      mainPath,
      '\nresource   "null_resource"   "extra"   {\n  triggers = { foo =  "bar" }\n}\n' // mis-spaced
    );
  }, 120000);

  it('detects formatting issues in check mode then formats and becomes idempotent', async () => {
    ensureTerraformInit(projectName);

    // 1. Check mode should report needsFormatting
    const checkResult = await runTerraformExecutor(
      projectName,
      'terraform-fmt',
      { check: true }
    );

    expect(checkResult.success).toBe(false); // non-zero path => formatting needed
    expect(checkResult.needsFormatting).toBe(true);
    expect(checkResult.changedCount).toBeGreaterThan(0);

    // 2. Run formatter (write mode)
    const writeResult = await runTerraformExecutor(
      projectName,
      'terraform-fmt',
      {}
    );

    expect(writeResult.success).toBe(true);
    expect(writeResult.changedCount).toBeGreaterThan(0); // file actually changed

    // 3. Re-run check; should now be clean & success
    const postCheck = await runTerraformExecutor(projectName, 'terraform-fmt', {
      check: true,
    });

    expect(postCheck.success).toBe(true);
    expect(postCheck.changedCount).toBe(0);
  }, 240000);
});
