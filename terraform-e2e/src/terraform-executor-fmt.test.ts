import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
} from './utils/e2e-helpers';

describe('terraform-executor-fmt', () => {
  const projectName = uniqueName('fmtproj');

  beforeAll(() => {
    const root = getWorkspaceRoot();
    execSync(
      `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`,
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NX_DAEMON: 'false' },
      }
    );
    // Intentionally introduce poor formatting (extra spaces, no newline)
    const mainPath = path.join(root, 'packages', projectName, 'main.tf');
    fs.appendFileSync(
      mainPath,
      '\nresource   "null_resource"   "extra"   {\n  triggers = { foo =  "bar" }\n}\n' // mis-spaced
    );
  }, 120000);

  it('detects formatting issues in check mode then formats and becomes idempotent', async () => {
    const root = getWorkspaceRoot();
    const fmtExecutor = require(path.join(
      root,
      'dist/terraform/src/executors/terraform-fmt/executor.js'
    )).default;
    const context = {
      projectName,
      root,
      cwd: root,
      projectsConfigurations: {
        version: 2,
        projects: { [projectName]: { root: `packages/${projectName}` } },
      },
    } as any;

    ensureTerraformInit(projectName);

    // 1. Check mode should report needsFormatting
    const checkResult = await fmtExecutor({ check: true }, context);
    expect(checkResult.success).toBe(false); // non-zero path => formatting needed
    expect(checkResult.needsFormatting).toBe(true);
    expect(checkResult.changedCount).toBeGreaterThan(0);

    // 2. Run formatter (write mode)
    const writeResult = await fmtExecutor({}, context);
    expect(writeResult.success).toBe(true);
    expect(writeResult.changedCount).toBeGreaterThan(0); // file actually changed

    // 3. Re-run check; should now be clean & success
    const postCheck = await fmtExecutor({ check: true }, context);
    expect(postCheck.success).toBe(true);
    expect(postCheck.changedCount).toBe(0);
  }, 240000);
});
