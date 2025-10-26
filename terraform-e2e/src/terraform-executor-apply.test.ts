import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  mutateTerraformFile,
  getWorkspaceRoot,
  ensureTerraformInit,
} from './utils/e2e-helpers';
describe('terraform-executor-apply', () => {
  const projectName = uniqueName('tf-apply');

  it('plans, applies, detects stale plan, replans, reapplies', async () => {
    const root = getWorkspaceRoot();
    execSync(
      `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`,
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NX_DAEMON: 'false' },
      }
    );

    // Invoke plan + apply executors programmatically (Nx project graph discovery unreliable in tests)
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
    const plan1 = await planExecutor({ env: 'dev' }, context);
    expect(plan1.success).toBe(true);
    const apply1 = await applyExecutor({ env: 'dev' }, context);
    expect(apply1.success).toBe(true);

    const pjPath = path.join(root, 'packages', projectName, 'project.json');
    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf-8'));
    if (pj.targets['terraform-apply']?.dependsOn) {
      delete pj.targets['terraform-apply'].dependsOn;
      fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2));
    }

    mutateTerraformFile(projectName, 'main.tf', '# stale mutation');

    // Attempt apply without re-plan should detect stale plan
    const staleApply = await applyExecutor({ env: 'dev' }, context);
    expect(staleApply.success).toBe(false);
    expect(staleApply.stale).toBe(true);

    // Re-plan and apply again
    const plan2 = await planExecutor({ env: 'dev' }, context);
    expect(plan2.success).toBe(true);
    const apply2 = await applyExecutor({ env: 'dev' }, context);
    expect(apply2.success).toBe(true);
  }, 240000);
});
