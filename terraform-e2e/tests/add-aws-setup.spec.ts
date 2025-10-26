import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('add-aws-setup generator e2e', () => {
  const workspaceRoot = path.join(__dirname, '..', '..'); // terraform/terraform-e2e -> terraform/
  const genProject = 'aws-backend-test';
  const outDir = path.join(workspaceRoot, 'packages', genProject);

  beforeAll(() => {
    if (fs.existsSync(outDir))
      fs.rmSync(outDir, { recursive: true, force: true });
    // run generator via nx CLI inside plugin workspace
    execSync(
      `npx nx g terraform:add-aws-setup --name=${genProject} --bucketPrefix=e2e-prefix`,
      { cwd: workspaceRoot, stdio: 'inherit' }
    );
  });

  it('created terraform files', () => {
    expect(fs.existsSync(path.join(outDir, 'backend.tf'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 's3.tf'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'main.tf'))).toBe(true);
  });

  it('renders bucket prefix', () => {
    const localContent = fs.readFileSync(
      path.join(outDir, 'local.tf'),
      'utf-8'
    );
    expect(localContent).toContain('e2e-prefix-');
  });
});
