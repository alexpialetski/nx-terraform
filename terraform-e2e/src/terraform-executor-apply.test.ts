import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  mutateTerraformFile,
  getWorkspaceRoot,
  ensureTerraformInit,
  runCLI,
  runTerraformExecutor,
} from './utils/e2e-helpers';
describe('terraform-executor-apply', () => {
  const projectName = uniqueName('tf-apply');

  it('plans, applies, detects stale plan, replans, reapplies', async () => {
    const root = getWorkspaceRoot();

    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );

    ensureTerraformInit(projectName);

    const plan1 = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
    });

    expect(plan1.success).toBe(true);

    const apply1 = await runTerraformExecutor(projectName, 'terraform-apply', {
      env: 'dev',
    });

    expect(apply1.success).toBe(true);

    const pjPath = path.join(root, 'packages', projectName, 'project.json');
    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf-8'));

    if (pj.targets['terraform-apply']?.dependsOn) {
      delete pj.targets['terraform-apply'].dependsOn;

      fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2));
    }

    mutateTerraformFile(projectName, 'main.tf', '# stale mutation');

    // Attempt apply without re-plan should detect stale plan
    const staleApply = await runTerraformExecutor(
      projectName,
      'terraform-apply',
      { env: 'dev' }
    );

    expect(staleApply.success).toBe(false);
    expect(staleApply.stale).toBe(true);

    // Re-plan and apply again
    const plan2 = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
    });

    expect(plan2.success).toBe(true);

    const apply2 = await runTerraformExecutor(projectName, 'terraform-apply', {
      env: 'dev',
    });

    expect(apply2.success).toBe(true);
  }, 240000);
});
