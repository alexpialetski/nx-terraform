import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('add-terraform-project generator', () => {
  const workspaceRoot = path.join(__dirname, '..', '..');
  const projectName = `tf-generic-${Date.now()}`;
  const projectRoot = path.join(workspaceRoot, 'packages', projectName);

  it('generates generic terraform project with environments and runs plan', () => {
    const cmd = `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev,qa --provider=null`;
    execSync(cmd, { cwd: workspaceRoot, stdio: 'inherit', env: process.env });

    // Files
    [
      'main.tf',
      'variables.tf',
      'outputs.tf',
      'provider.tf',
      'tfvars/dev.tfvars',
      'tfvars/qa.tfvars',
      'project.json',
    ].forEach((f) => {
      expect(fs.existsSync(path.join(projectRoot, f))).toBe(true);
    });

    // Project config
    const pj = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'project.json'), 'utf-8')
    );
    expect(pj.targets['terraform-plan']).toBeDefined();
    expect(pj.targets['terraform-plan'].configurations.dev).toBeDefined();

    // Run plan (dev config) - should produce artifact directory
    execSync(`npx nx run ${projectName}:terraform-plan --configuration=dev`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });
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
