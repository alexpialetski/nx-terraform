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
import { ProjectConfiguration } from '@nx/devkit';

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
      'nx g nx-terraform:terraform-module shared-module --backendProject=""',
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
    ) as ProjectConfiguration;
    expect(sharedModuleProject.projectType).toBe('application');

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

    // Generate standalone terraform module (library) that uses its own backend
    execSync(
      'nx g nx-terraform:terraform-module terraform-standalone-infra --backendProject=""',
      {
        cwd: projectDirectory,
        stdio: 'inherit',
      }
    );

    resetNx(projectDirectory);

    // Verify terraform-standalone-infra project was created
    const projectsAfterStandalone = execNxCommand(
      'show projects',
      projectDirectory
    );
    expect(projectsAfterStandalone).toContain('terraform-standalone-infra');

    // Verify terraform-standalone-infra is a library (simple module)
    const standaloneProject = execNxCommand(
      'show project terraform-standalone-infra',
      projectDirectory
    ) as ProjectConfiguration;
    expect(standaloneProject.projectType).toBe('application');

    const standaloneProjectPath = join(
      projectDirectory,
      'packages/terraform-standalone-infra'
    );

    // Add backend.tf with local backend and hardcoded state file path
    writeFileSync(
      join(standaloneProjectPath, 'backend.tf'),
      readFileSync(join(__dirname, 'files/standalone_backend.tf'), 'utf-8')
    );

    // Add provider.tf for local provider
    writeFileSync(
      join(standaloneProjectPath, 'provider.tf'),
      readFileSync(join(__dirname, 'files/standalone_provider.tf'), 'utf-8')
    );

    // Add module reference to shared-module
    writeFileSync(
      join(standaloneProjectPath, 'module_reference.tf'),
      readFileSync(
        join(__dirname, 'files/standalone_module_reference.tf'),
        'utf-8'
      )
    );

    // Add a resource that uses the module output
    writeFileSync(
      join(standaloneProjectPath, 'new_resource.tf'),
      readFileSync(join(__dirname, 'files/standalone_new_resource.tf'), 'utf-8')
    );

    // Verify dependency is detected in the project graph
    // First, trigger dependency calculation by resetting the cache
    resetNx(projectDirectory);

    const projectGraph = getProjectGraph(projectDirectory);
    // Check for static dependency from terraform-infra to shared-module
    verifyStaticDependency(projectGraph, 'terraform-infra', 'shared-module');

    // Check for static dependency from terraform-infra to terraform-setup (backend dependency)
    verifyStaticDependency(projectGraph, 'terraform-infra', 'terraform-setup');

    // Check for static dependency from terraform-standalone-infra to shared-module
    verifyStaticDependency(
      projectGraph,
      'terraform-standalone-infra',
      'shared-module'
    );

    // Run sync generator to update project configurations
    execSync('nx sync', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });

    // Run terraform-apply on both terraform-infra and terraform-standalone-infra
    execSync('nx run-many -t terraform-apply', {
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

    // Verify the local file resource was created successfully using module output\
    expect(
      readFileSync(join(infraProjectPath, 'test-output.txt'), 'utf-8')
    ).toBe('Hello from shared-module!');

    // Verify terraform-standalone-infra has its own state file
    expect(
      existsSync(join(standaloneProjectPath, 'terraform.tfstate'))
    ).toBeTruthy();

    // Verify the local file resource was created successfully in terraform-standalone-infra using module output
    expect(
      readFileSync(join(standaloneProjectPath, 'test-output.txt'), 'utf-8')
    ).toBe('Hello from shared-module!');
  }, 120000);
});
