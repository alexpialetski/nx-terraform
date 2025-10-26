import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  mutateTerraformFile,
  runCLI,
  runTerraformExecutor,
} from './utils/e2e-helpers';

/**
 * Verifies that applying with --force succeeds even when the plan hash is stale.
 */
describe('terraform-executor-apply (force)', () => {
  const projectName = uniqueName('tf-apply-force');

  it('applies stale plan successfully with --force', async () => {
    const root = getWorkspaceRoot();

    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );

    ensureTerraformInit(projectName);

    const initialPlan = await runTerraformExecutor(
      projectName,
      'terraform-plan',
      { env: 'dev', workspaceStrategy: 'none' }
    );

    expect(initialPlan.success).toBe(true);

    mutateTerraformFile(projectName, 'main.tf', '# force stale change');

    // Apply without re-plan but with force flag should succeed (stale plan bypassed)
    const forcedApply = await runTerraformExecutor(
      projectName,
      'terraform-apply',
      { env: 'dev', force: true }
    );

    expect(forcedApply.success).toBe(true);
    expect(forcedApply.stale).toBe(true);
  }, 180000);
});
