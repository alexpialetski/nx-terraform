import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  runCLI,
  checkFilesExist,
  readJson,
  runTerraformExecutor,
} from './utils/e2e-helpers';

describe('terraform-generator-add-terraform-project', () => {
  const workspaceRoot = getWorkspaceRoot();

  it('generates multi-env project and successful plan artifact (dev)', async () => {
    const projectName = uniqueName('tf-generic');
    const projectRoot = path.join(workspaceRoot, 'packages', projectName);

    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev,qa --provider=null`
    );

    checkFilesExist(
      `packages/${projectName}/main.tf`,
      `packages/${projectName}/provider.tf`,
      `packages/${projectName}/variables.tf`,
      `packages/${projectName}/outputs.tf`,
      `packages/${projectName}/tfvars/dev.tfvars`
    );

    // Optional items (multi-env & project.json) if generator evolves
    ['tfvars/qa.tfvars', 'project.json'].forEach((opt) => {
      if (fs.existsSync(path.join(projectRoot, opt))) {
        expect(
          fs.readFileSync(path.join(projectRoot, opt), 'utf-8').length
        ).toBeGreaterThan(0);
      }
    });

    if (fs.existsSync(path.join(projectRoot, 'project.json'))) {
      const pj = readJson<any>(`packages/${projectName}/project.json`);

      expect(pj.targets['terraform-plan']).toBeDefined();
      expect(pj.targets['terraform-plan'].configurations?.dev).toBeDefined();
    }

    // Run executor through abstraction with explicit init
    ensureTerraformInit(projectName);

    const result = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
      workspaceStrategy: 'none',
    });

    expect(result.success).toBe(true);

    const artifactBase = path.join(
      workspaceRoot,
      '.nx',
      'terraform',
      projectName,
      'dev'
    );

    expect(fs.existsSync(artifactBase)).toBe(true);
  }, 180000);
});
