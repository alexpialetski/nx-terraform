import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import {
  cleanupTestProject,
  createTestProject,
  execNxCommand,
  getProjectGraph,
  resetNx,
  verifyStaticDependency,
} from './testUtils';

describe('create-nx-terraform-app', () => {
  let projectDirectory: string;

  afterAll(() => {
    if (projectDirectory) {
      // Cleanup the test project
      cleanupTestProject(projectDirectory);
    }
  });

  test('end to end flow', () => {
    projectDirectory = createTestProject('test-project', '--backendType=local');

    // npm ls will fail if the package is not installed properly
    execSync('npm ls nx-terraform', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });

    // Verify initial projects exist
    expect(execNxCommand('show projects', projectDirectory)).toEqual([
      'terraform-infra',
      'terraform-setup',
    ]);

    // Verify terraform-setup backend project exists
    const backendProject = execNxCommand(
      'show project terraform-setup',
      projectDirectory
    );
    const backendProjectPath = join(
      projectDirectory,
      'packages/terraform-setup'
    );
    expect(backendProject).toMatchSnapshot();

    // Verify terraform-infra stateful module exists
    const infraProject = execNxCommand(
      'show project terraform-infra',
      projectDirectory
    );
    const infraProjectPath = join(projectDirectory, 'packages/terraform-infra');
    expect(infraProject).toMatchSnapshot();

    // Generate stateless terraform module (library)
    execSync(
      'nx g nx-terraform:terraform-module shared-module --backendType=local --backendProject=""',
      {
        cwd: projectDirectory,
        stdio: 'inherit',
      }
    );

    resetNx(projectDirectory);

    // Verify shared-module project was created
    const projectsAfterModule = execNxCommand(
      'show projects',
      projectDirectory
    );
    expect(projectsAfterModule).toContain('shared-module');

    // Verify shared-module is a library (stateless module)
    const sharedModuleProject = execNxCommand(
      'show project shared-module',
      projectDirectory
    );
    expect(sharedModuleProject.projectType).toBe('library');

    // Add outputs to shared-module
    const sharedModulePath = join(projectDirectory, 'packages/shared-module');
    writeFileSync(
      join(sharedModulePath, 'outputs.tf'),
      readFileSync(join(__dirname, 'files/shared_module_outputs.tf'), 'utf-8')
    );

    // Add module reference to terraform-infra
    writeFileSync(
      join(infraProjectPath, 'module_reference.tf'),
      readFileSync(join(__dirname, 'files/module_reference.tf'), 'utf-8')
    );

    // Add a resource that uses the module output
    writeFileSync(
      join(infraProjectPath, 'new_resource.tf'),
      readFileSync(join(__dirname, 'files/new_resource.tf'), 'utf-8')
    );

    // Verify dependency is detected in the project graph
    // First, trigger dependency calculation by resetting the cache
    resetNx(projectDirectory);

    const projectGraph = getProjectGraph(projectDirectory);
    // Check for static dependency from terraform-infra to shared-module
    verifyStaticDependency(
      projectGraph,
      'terraform-infra',
      'shared-module'
    );

    // Check for static dependency from terraform-infra to terraform-setup (backend dependency)
    verifyStaticDependency(
      projectGraph,
      'terraform-infra',
      'terraform-setup'
    );

    // Run terraform-apply on terraform-infra
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

    // Verify the local file resource was created successfully using module output
    expect(existsSync(join(infraProjectPath, 'test-output.txt'))).toBeTruthy();
    expect(
      readFileSync(join(infraProjectPath, 'test-output.txt'), 'utf-8')
    ).toBe('Hello from shared-module!');
  }, 120000);
});
