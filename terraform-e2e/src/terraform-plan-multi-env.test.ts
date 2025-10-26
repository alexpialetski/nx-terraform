import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
} from './utils/e2e-helpers';

/**
 * Ensures planning different environments produces isolated artifact directories.
 */
describe('terraform-plan multi-env isolation', () => {
  const projectName = uniqueName('tf-multi');
  it('creates distinct artifact dirs per environment (dev vs qa)', async () => {
    const root = getWorkspaceRoot();
    execSync(
      `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev,qa --provider=null`,
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
    const context = {
      projectName,
      root,
      projectsConfigurations: {
        version: 2,
        projects: { [projectName]: { root: `packages/${projectName}` } },
      },
    } as any;

    ensureTerraformInit(projectName);
    const planDev = await planExecutor(
      { env: 'dev', workspaceStrategy: 'none' },
      context
    );
    expect(planDev.success).toBe(true);
    const planQa = await planExecutor(
      { env: 'qa', workspaceStrategy: 'none' },
      context
    );
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
