import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';

describe('create-nx-terraform-app', () => {
  let projectDirectory: string;

  afterAll(() => {
    if (projectDirectory) {
      // Cleanup the test project
      rmSync(projectDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  test('end to end flow', () => {
    projectDirectory = createTestProject('--backendType=local');

    // npm ls will fail if the package is not installed properly
    execSync('npm ls nx-terraform', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });

    const backendProject = JSON.parse(
      execSync('nx show project terraform-setup --json', {
        cwd: projectDirectory,
      }).toString()
    );

    expect(backendProject).toMatchSnapshot();

    execSync('nx run terraform-setup:terraform-apply', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });
    expect(
      existsSync(
        projectDirectory + '/packages/terraform-setup/terraform.tfstate'
      )
    ).toBeTruthy();
    expect(
      readFileSync(
        projectDirectory + '/packages/terraform-setup/backend.config',
        'utf-8'
      )
    ).toMatch(
      `path = "${projectDirectory}/packages/terraform-setup/terraform.tfstate`
    );
  });
});

/**
 * Creates a test project with create-nx-workspace and installs the plugin
 * @returns The directory where the test project was created
 */
function createTestProject(extraArgs = '') {
  const projectName = 'test-project';
  const projectDirectory = join(process.cwd(), 'tmp', projectName);

  // Ensure projectDirectory is empty
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  execSync(`npx create-nx-terraform-app@e2e ${projectName} ${extraArgs}`, {
    cwd: dirname(projectDirectory),
    stdio: 'inherit',
    env: process.env,
  });
  console.log(`Created test project in "${projectDirectory}"`);

  return projectDirectory;
}
