import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { uniqueName, getWorkspaceRoot } from './utils/e2e-helpers';

describe('terraform-generator-add-aws-setup (basic)', () => {
  const workspaceRoot = getWorkspaceRoot();
  it('creates core terraform files and renders bucket prefix', () => {
    const projectName = uniqueName('aws-basic');
    const outDir = path.join(workspaceRoot, 'packages', projectName);
    if (fs.existsSync(outDir))
      fs.rmSync(outDir, { recursive: true, force: true });
    execSync(
      `npx nx g terraform:add-aws-setup --name=${projectName} --bucketPrefix=e2e-prefix`,
      { cwd: workspaceRoot, stdio: 'inherit' }
    );
    [
      'backend.tf',
      's3.tf',
      'main.tf',
      'provider.tf',
      'scripts/check_bucket.sh',
    ].forEach((f) => expect(fs.existsSync(path.join(outDir, f))).toBe(true));
    const localContent = fs.readFileSync(
      path.join(outDir, 'local.tf'),
      'utf-8'
    );
    expect(localContent).toContain('e2e-prefix-');
  });
});
