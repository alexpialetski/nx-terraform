import * as path from 'path';
import * as fs from 'fs';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  runCLI,
  runTerraformExecutor,
} from './utils/e2e-helpers';

describe('terraform-executor-validate', () => {
  const projectName = uniqueName('valproj');

  beforeAll(() => {
    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );
  }, 120000);

  it('validates a correct configuration then fails after introducing syntax error', async () => {
    const root = getWorkspaceRoot();

    ensureTerraformInit(projectName);

    const ok = await runTerraformExecutor(projectName, 'terraform-validate', {
      env: 'dev',
      workspaceStrategy: 'none',
    });

    expect(ok.success).toBe(true);

    // Introduce syntax error (missing closing brace)
    const mainPath = path.join(root, 'packages', projectName, 'main.tf');
    fs.appendFileSync(mainPath, '\nresource "null_resource" "broken" {');

    const fail = await runTerraformExecutor(projectName, 'terraform-validate', {
      env: 'dev',
      workspaceStrategy: 'none',
    });
    expect(fail.success).toBe(false);
  }, 240000);
});
