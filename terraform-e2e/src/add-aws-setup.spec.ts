import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// NOTE: Duplicate of tests/add-aws-setup.spec.ts. Keeping file but skipping to avoid running generator twice.
describe.skip('add-aws-setup generator e2e (duplicate skipped)', () => {
  const workspaceRoot = path.join(__dirname, '..'); // terraform-e2e -> terraform/
  const genProject = 'aws-backend-test';
  const outDir = path.join(workspaceRoot, 'packages', genProject);

  beforeAll(() => {
    if (fs.existsSync(outDir))
      fs.rmSync(outDir, { recursive: true, force: true });
    execSync(
      `npx nx g terraform:add-aws-setup --name=${genProject} --bucketPrefix=e2e-prefix`,
      { cwd: workspaceRoot, stdio: 'inherit' }
    );
  });

  it('skipped duplicate test', () => {
    expect(true).toBe(true);
  });
});
