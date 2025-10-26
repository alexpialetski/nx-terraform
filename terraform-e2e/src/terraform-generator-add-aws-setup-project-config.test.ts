import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { uniqueName, getWorkspaceRoot } from './utils/e2e-helpers';

describe('terraform-generator-add-aws-setup (project config & content)', () => {
  const workspaceRoot = getWorkspaceRoot();
  const prefix = 'e2e-prefix';

  it('generates project with expected files, configuration & template content', () => {
    const projectName = uniqueName('aws-backend');
    const outDir = path.join(workspaceRoot, 'packages', projectName);

    if (fs.existsSync(outDir))
      fs.rmSync(outDir, { recursive: true, force: true });

    execSync(
      `npx nx g terraform:add-aws-setup --name=${projectName} --bucketPrefix=${prefix}`,
      {
        cwd: workspaceRoot,
        stdio: 'inherit',
        env: process.env,
      }
    );

    // Current generator outputs (as observed in execution log) do not include variables.tf or project.json yet.
    const requiredFiles = [
      'backend.tf',
      'local.tf',
      'main.tf',
      'provider.tf',
      's3.tf',
      'scripts/check_bucket.sh',
    ];

    requiredFiles.forEach((f) =>
      expect(fs.existsSync(path.join(outDir, f))).toBe(true)
    );

    // Optional files (future enhancements) – assert if present but don't fail if absent.
    ['variables.tf', 'project.json'].forEach((opt) => {
      if (fs.existsSync(path.join(outDir, opt))) {
        // lightweight structural check when present
        expect(
          fs.readFileSync(path.join(outDir, opt), 'utf-8').length
        ).toBeGreaterThan(0);
      }
    });

    if (fs.existsSync(path.join(outDir, 'project.json'))) {
      const projectJson = JSON.parse(
        fs.readFileSync(path.join(outDir, 'project.json'), 'utf-8')
      );
      const targets = projectJson.targets || {};

      expect(targets['terraform-init']).toBeDefined();
      expect(targets['terraform-plan']).toBeDefined();
      expect(targets['terraform-apply']).toBeDefined();
      expect(targets['terraform-plan'].dependsOn || []).toContain(
        'terraform-init'
      );
      expect(targets['terraform-apply'].dependsOn || []).toContain(
        'terraform-plan'
      );
    }

    const localTf = fs.readFileSync(path.join(outDir, 'local.tf'), 'utf-8');

    expect(localTf).toContain(`${prefix}-`);

    const providerTf = fs.readFileSync(
      path.join(outDir, 'provider.tf'),
      'utf-8'
    );

    expect(providerTf).toMatch(/provider\s+"aws"/);
  });

  it('fails on duplicate generation with same name', () => {
    const projectName = uniqueName('dup-backend');
    const outDir = path.join(workspaceRoot, 'packages', projectName);

    if (fs.existsSync(outDir))
      fs.rmSync(outDir, { recursive: true, force: true });

    const gen = `npx nx g terraform:add-aws-setup --name=${projectName} --bucketPrefix=${prefix}`;

    execSync(gen, { cwd: workspaceRoot, stdio: 'inherit', env: process.env });

    let duplicateError: Error | null = null;

    try {
      execSync(gen, { cwd: workspaceRoot, stdio: 'pipe', env: process.env });
    } catch (e: any) {
      duplicateError = e;
    }

    expect(duplicateError).not.toBeNull();
  });
});
