import * as fs from 'fs';
import * as path from 'path';
import {
  uniqueName,
  getWorkspaceRoot,
  ensureTerraformInit,
  runCLI,
  runTerraformExecutor,
} from './utils/e2e-helpers';

describe('terraform-executor-plan', () => {
  const projectName = uniqueName('planproj');

  beforeAll(() => {
    runCLI(
      `generate terraform:add-terraform-project --name=${projectName} --envs=dev --provider=null`
    );
  }, 120000);

  it('produces plan.json, summary.json and plan.meta.json with expected fields', async () => {
    ensureTerraformInit(projectName);

    const result = await runTerraformExecutor(projectName, 'terraform-plan', {
      env: 'dev',
      workspaceStrategy: 'none',
    });

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
