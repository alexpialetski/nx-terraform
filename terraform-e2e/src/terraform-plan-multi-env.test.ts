import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  runCLI,
  runTerraformExecutor,
} from './utils/e2e-helpers';

/**
 * Ensures planning different environments produces isolated artifact directories.
 */
describe('terraform-plan multi-env isolation', () => {
  const projectName = uniqueName('tf-multi');

  it('creates distinct artifact dirs per environment (dev vs qa)', async () => {
    const root = getWorkspaceRoot();

    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev,qa --provider=null`
    );

    ensureTerraformInit(projectName);

    const planDev = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
      workspaceStrategy: 'none',
    });

    expect(planDev.success).toBe(true);

    const planQa = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'qa',
      workspaceStrategy: 'none',
    });

    expect(planQa.success).toBe(true);

    const baseDev = path.join(root, '.nx', 'terraform', projectName, 'dev');
    const baseQa = path.join(root, '.nx', 'terraform', projectName, 'qa');
    expect(fs.existsSync(baseDev)).toBe(true);
    expect(fs.existsSync(baseQa)).toBe(true);

    // Hashes should differ given differing tfvars / env identifier, but tolerate equality fallback.
    if (planDev.hash && planQa.hash) {
      expect(planDev.hash === planQa.hash).toBe(false);
    }
  }, 200000);
});
