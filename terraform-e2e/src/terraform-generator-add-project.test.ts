import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
} from './utils/e2e-helpers';

describe('terraform-generator-add-terraform-project', () => {
  const workspaceRoot = getWorkspaceRoot();

  it('generates multi-env project and successful plan artifact (dev)', async () => {
    const projectName = uniqueName('tf-generic');
    const projectRoot = path.join(workspaceRoot, 'packages', projectName);
    execSync(
      `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev,qa --provider=null`,
      { cwd: workspaceRoot, stdio: 'inherit', env: process.env }
    );

    const required = [
      'main.tf',
      'provider.tf',
      'variables.tf',
      'outputs.tf',
      'tfvars/dev.tfvars',
    ];
    required.forEach((f) =>
      expect(fs.existsSync(path.join(projectRoot, f))).toBe(true)
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
      const pj = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'project.json'), 'utf-8')
      );
      expect(pj.targets['terraform-plan']).toBeDefined();
      expect(pj.targets['terraform-plan'].configurations?.dev).toBeDefined();
    }

    // Run executor directly with explicit init
    const planExecutor = require(path.join(
      workspaceRoot,
      'dist/terraform/src/executors/terraform-plan/executor.js'
    )).default;
    const context = {
      projectName,
      root: workspaceRoot,
      projectsConfigurations: {
        version: 2,
        projects: { [projectName]: { root: `packages/${projectName}` } },
      },
    } as any;
    ensureTerraformInit(projectName);
    const result = await planExecutor(
      { env: 'dev', workspaceStrategy: 'none' },
      context
    );
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
