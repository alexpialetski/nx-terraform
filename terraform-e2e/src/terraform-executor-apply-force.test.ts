import { execSync } from 'child_process';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  mutateTerraformFile,
} from './utils/e2e-helpers';

/**
 * Verifies that applying with --force succeeds even when the plan hash is stale.
 */
describe('terraform-executor-apply (force)', () => {
  const projectName = uniqueName('tf-apply-force');
  it('applies stale plan successfully with --force', async () => {
    const root = getWorkspaceRoot();
    execSync(
      `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`,
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NX_DAEMON: 'false' },
      }
    );

    const planExecutor = require(path.join(
      root,
      'dist/terraform/src/executors/terraform-plan/executor.js'
    )).default;
    const applyExecutor = require(path.join(
      root,
      'dist/terraform/src/executors/terraform-apply/executor.js'
    )).default;
    const context = {
      projectName,
      root,
      projectsConfigurations: {
        version: 2,
        projects: { [projectName]: { root: `packages/${projectName}` } },
      },
    } as any;

    ensureTerraformInit(projectName);
    const initialPlan = await planExecutor(
      { env: 'dev', workspaceStrategy: 'none' },
      context
    );
    expect(initialPlan.success).toBe(true);

    mutateTerraformFile(projectName, 'main.tf', '# force stale change');

    // Apply without re-plan but with force flag should succeed (stale plan bypassed)
    const forcedApply = await applyExecutor(
      { env: 'dev', force: true },
      context
    );
    expect(forcedApply.success).toBe(true);
    expect(forcedApply.stale).toBe(true);
  }, 180000);
});
