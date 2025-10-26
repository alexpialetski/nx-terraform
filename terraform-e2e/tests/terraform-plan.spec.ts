import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('terraform-plan executor (artifact + metadata)', () => {
  const workspaceRoot = path.join(__dirname, '..', '..');
  const projectName = `planproj-${Date.now()}`;
  const projectRoot = path.join(workspaceRoot, 'packages', projectName);

  beforeAll(() => {
    fs.mkdirSync(projectRoot, { recursive: true });
    // minimal terraform config using null provider (fast, no creds)
    fs.writeFileSync(
      path.join(projectRoot, 'main.tf'),
      `terraform {\n  required_providers {\n    null = { source = \"hashicorp/null\", version = ">=3.2.1" }\n  }\n}\n\nprovider \"null\" {}\n\nresource \"null_resource\" \"example\" {}`,
      'utf-8'
    );
    // project configuration referencing plugin executors
    fs.writeFileSync(
      path.join(projectRoot, 'project.json'),
      JSON.stringify(
        {
          name: projectName,
          root: `packages/${projectName}`,
          sourceRoot: `packages/${projectName}`,
          projectType: 'application',
          targets: {
            'terraform-init': { executor: 'terraform:terraform-init' },
            'terraform-plan': {
              executor: 'terraform:terraform-plan',
              dependsOn: ['terraform-init'],
            },
          },
        },
        null,
        2
      ),
      'utf-8'
    );
  }, 120000);

  it('produces plan.json, summary.json and plan.meta.json with expected fields', () => {
    // Run plan
    execSync(`npx nx run ${projectName}:terraform-plan`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
    });

    const artifactBase = path.join(
      workspaceRoot,
      '.nx',
      'terraform',
      projectName
    );
    expect(fs.existsSync(artifactBase)).toBe(true);
    // find env dir
    const envDirs = fs.readdirSync(artifactBase);
    expect(envDirs.length).toBeGreaterThan(0);
    const envDir = path.join(artifactBase, envDirs[0]);
    const hashDirs = fs.readdirSync(envDir);
    expect(hashDirs.length).toBeGreaterThan(0);
    const finalDir = path.join(envDir, hashDirs[0]);

    const planJson = path.join(finalDir, 'plan.json');
    const summaryJson = path.join(finalDir, 'summary.json');
    const metaJson = path.join(finalDir, 'plan.meta.json');

    expect(fs.existsSync(planJson)).toBe(true);
    expect(fs.existsSync(summaryJson)).toBe(true);
    expect(fs.existsSync(metaJson)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(summaryJson, 'utf-8'));
    expect(summary.project).toBe(projectName);
    expect(
      summary.actions?.create || summary.actions?.add || 0
    ).toBeGreaterThan(0);

    const meta = JSON.parse(fs.readFileSync(metaJson, 'utf-8'));
    expect(meta.project).toBe(projectName);
    expect(meta.hash).toBeDefined();
    expect(meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(meta.fileCount).toBeGreaterThan(0);
  }, 240000);
});
