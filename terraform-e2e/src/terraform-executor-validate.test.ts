import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
} from './utils/e2e-helpers';

describe('terraform-executor-validate', () => {
  const projectName = uniqueName('valproj');

  beforeAll(() => {
    const root = getWorkspaceRoot();
    execSync(
      `npx nx g terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`,
      {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, NX_DAEMON: 'false' },
      }
    );
  }, 120000);

  it('validates a correct configuration then fails after introducing syntax error', async () => {
    const root = getWorkspaceRoot();
    const validateExecutor = require(path.join(
      root,
      'dist/terraform/src/executors/terraform-validate/executor.js'
    )).default;
    const context = {
      projectName,
      root,
      cwd: root,
      projectsConfigurations: {
        version: 2,
        projects: { [projectName]: { root: `packages/${projectName}` } },
      },
    } as any;

    ensureTerraformInit(projectName);

    const ok = await validateExecutor(
      { env: 'dev', workspaceStrategy: 'none' },
      context
    );
    expect(ok.success).toBe(true);

    // Introduce syntax error (missing closing brace)
    const mainPath = path.join(root, 'packages', projectName, 'main.tf');
    fs.appendFileSync(mainPath, '\nresource "null_resource" "broken" {');

    const fail = await validateExecutor(
      { env: 'dev', workspaceStrategy: 'none' },
      context
    );
    expect(fail.success).toBe(false);
  }, 240000);
});
