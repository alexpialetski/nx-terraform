import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync } from 'fs';

describe('terraform-plugin-installation', () => {
  let projectDirectory: string;

  beforeAll(() => {
    projectDirectory = createTestProject();
    execSync(`npm install -D terraform@e2e`, {
      cwd: projectDirectory,
      stdio: 'inherit',
      env: process.env,
    });
  }, 180000);

  afterAll(() => {
    if (projectDirectory) {
      rmSync(projectDirectory, { recursive: true, force: true });
    }
  });

  it('installs plugin successfully', () => {
    execSync('npm ls terraform', { cwd: projectDirectory, stdio: 'inherit' });
  });
});

function createTestProject() {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);
  rmSync(projectDirectory, { recursive: true, force: true });
  mkdirSync(dirname(projectDirectory), { recursive: true });
  execSync(
    `npx create-nx-workspace@latest ${projectName} --preset apps --nxCloud=skip --no-interactive`,
    { cwd: dirname(projectDirectory), stdio: 'inherit', env: process.env }
  );
  return projectDirectory;
}
