import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
} from './utils/e2e-helpers';
import { execSync } from 'child_process';

describe('terraform-executor-plan', () => {
  const projectName = uniqueName('planproj');

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

  it('produces plan.json, summary.json and plan.meta.json with expected fields', async () => {
    const root = getWorkspaceRoot();
    const planExecutor = require(path.join(
      root,
      'dist/terraform/src/executors/terraform-plan/executor.js'
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
    const result = await planExecutor(
      { env: 'dev', workspaceStrategy: 'none' },
      context
    );
    expect(result.success).toBe(true);
    const artifactDir = result.artifactDir;
    const planPath = path.join(artifactDir, 'plan.json');
    const summaryPath = path.join(artifactDir, 'summary.json');
    const metaPath = path.join(artifactDir, 'plan.meta.json');
    expect(fs.existsSync(planPath)).toBe(true);
    expect(fs.existsSync(summaryPath)).toBe(true);
    expect(fs.existsSync(metaPath)).toBe(true);
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    expect(summary.project).toBe(projectName);
    expect(
      summary.actions?.create || summary.actions?.add || 0
    ).toBeGreaterThan(0);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    expect(meta.project).toBe(projectName);
    expect(meta.hash).toBeDefined();
    expect(meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(meta.fileCount).toBeGreaterThan(0);
    expect(path.basename(artifactDir).length).toBeGreaterThanOrEqual(6);
  }, 240000);
});
