import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, readFileSync, existsSync, writeFileSync } from 'fs';

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

    expect(
      JSON.parse(
        execSync('nx show projects --json', {
          cwd: projectDirectory,
        }).toString()
      )
    ).toEqual(['terraform-infra', 'terraform-setup']);

    // Verify terraform-setup backend project exists
    const backendProject = JSON.parse(
      execSync('nx show project terraform-setup --json', {
        cwd: projectDirectory,
      }).toString()
    );
    const backendProjectPath = join(
      projectDirectory,
      'packages/terraform-setup'
    );
    expect(backendProject).toMatchSnapshot();

    // Verify terraform-infra stateful module exists
    const infraProject = JSON.parse(
      execSync('nx show project terraform-infra --json', {
        cwd: projectDirectory,
      }).toString()
    );
    const infraProjectPath = join(projectDirectory, 'packages/terraform-infra');
    expect(infraProject).toMatchSnapshot();

    // Add local provider configuration to terraform-infra
    writeFileSync(
      join(infraProjectPath, 'provider.tf'),
      readFileSync(join(__dirname, 'files/local_provider.tf'), 'utf-8')
    );

    // Add a local file resource to terraform-infra to test resource creation
    writeFileSync(
      join(infraProjectPath, 'test_resource.tf'),
      readFileSync(join(__dirname, 'files/new_resource.tf'), 'utf-8')
    );

    // Run terraform-apply on terraform-infra
    // This should automatically apply terraform-setup first due to dependencies
    execSync('nx run terraform-infra:terraform-apply', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });

    // Verify backend was applied (terraform-setup state exists)
    expect(
      existsSync(join(backendProjectPath, 'terraform.tfstate'))
    ).toBeTruthy();

    // Verify backend.config was created
    expect(
      readFileSync(join(backendProjectPath, 'backend.config'), 'utf-8')
    ).toMatch(`path = "${join(backendProjectPath, 'terraform.tfstate')}`);

    // Verify the local file resource was created successfully
    expect(existsSync(join(infraProjectPath, 'test-output.txt'))).toBeTruthy();
    expect(
      readFileSync(join(infraProjectPath, 'test-output.txt'), 'utf-8')
    ).toBe('Hello from terraform-infra!');
  }, 1000000);
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
