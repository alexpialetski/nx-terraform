import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import {
  cleanupTestProject,
  createTestProject,
  execNxCommand,
  getProjectGraph,
  resetNx,
  updateProjectJson,
  updateTargetConfiguration,
  verifyStaticDependency,
  writeFileSyncRecursive,
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
    // ============================================
    // SECTION 1: Workspace Creation & Initial Setup
    // ============================================
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

    // ============================================
    // SECTION 2: Create Terraform-infra Stateful Module
    // ============================================
    // Verify terraform-infra stateful module exists
    const infraProject = execNxCommand(
      'show project terraform-infra',
      projectDirectory
    );
    const infraProjectPath = join(projectDirectory, 'packages/terraform-infra');
    // Add a test vars file
    writeFileSyncRecursive(
      join(infraProjectPath, 'tfvars/test.tfvars'),
      readFileSync(join(__dirname, 'files/infra/test.tfvars'), 'utf-8')
    );
    // Pass var file via target args; path is relative to project root (cwd when the command runs)
    updateProjectJson(
      infraProjectPath,
      updateTargetConfiguration('terraform-plan', (target) => ({
        ...target,
        options: {
          ...(target?.options ?? {}),
          args: ['-out=tfplan', '-var-file=tfvars/test.tfvars'],
        },
      }))
    );
    expect(infraProject).toMatchSnapshot();

    // ============================================
    // SECTION 3: Create Shared Module (Stateless)
    // ============================================
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
      readFileSync(join(__dirname, 'files/shared_module/outputs.tf'), 'utf-8')
    );

    // Add module reference to terraform-infra
    writeFileSync(
      join(infraProjectPath, 'module_reference.tf'),
      readFileSync(join(__dirname, 'files/module_reference.tf'), 'utf-8')
    );

    // Add a resource that uses the module output
    writeFileSync(
      join(infraProjectPath, 'new_resource.tf'),
      readFileSync(join(__dirname, 'files/infra/new_resource.tf'), 'utf-8')
    );

    // ============================================
    // SECTION 4: Create Standalone Module
    // ============================================
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
      readFileSync(join(__dirname, 'files/standalone/backend.tf'), 'utf-8')
    );

    // Add provider.tf for local provider
    writeFileSync(
      join(standaloneProjectPath, 'provider.tf'),
      readFileSync(join(__dirname, 'files/standalone/provider.tf'), 'utf-8')
    );

    // Run sync to update metadata before first apply
    resetNx(projectDirectory);

    // ============================================
    // SECTION 5: Apply Standalone Module (First Time)
    // ============================================
    // First terraform-apply: Apply terraform-standalone-infra WITHOUT module reference
    execSync('nx run terraform-standalone-infra:terraform-apply', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });

    // Verify first apply succeeded (state file exists)
    expect(
      existsSync(join(standaloneProjectPath, 'terraform.tfstate'))
    ).toBeTruthy();

    // ============================================
    // SECTION 6: Add Module Reference to Standalone
    // ============================================
    // Now add module reference to shared-module
    writeFileSync(
      join(standaloneProjectPath, 'module_reference.tf'),
      readFileSync(
        join(__dirname, 'files/standalone/module_reference.tf'),
        'utf-8'
      )
    );

    // Add a resource that uses the module output
    writeFileSync(
      join(standaloneProjectPath, 'new_resource.tf'),
      readFileSync(join(__dirname, 'files/standalone/new_resource.tf'), 'utf-8')
    );

    // Run sync again - this should update provider.tf metadata with the new module
    resetNx(projectDirectory);

    // Second terraform-apply: Apply terraform-standalone-infra WITH module reference
    // This should trigger terraform-init again because provider.tf changed
    execSync('nx run terraform-standalone-infra:terraform-apply', {
      cwd: projectDirectory,
      stdio: 'inherit',
    });

    // ============================================
    // SECTION 7: Verify Dependencies
    // ============================================
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

    // ============================================
    // SECTION 8: Apply terraform-infra & Final Verification
    // ============================================
    // Run sync generator to update project configurations
    resetNx(projectDirectory);

    // Run terraform-apply on terraform-infra (terraform-standalone-infra was already applied above)
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

    // Verify the local file resource was created successfully using module output\
    expect(
      readFileSync(join(infraProjectPath, 'test-output.txt'), 'utf-8')
    ).toBe('Hello from shared-module!');

    // Verify terraform-standalone-infra has its own state file
    expect(
      existsSync(join(standaloneProjectPath, 'terraform.tfstate'))
    ).toBeTruthy();

    // Verify the local file resource was created successfully in terraform-standalone-infra using module output
    // This file is created during the second terraform-apply (after module was added)
    // If terraform-init was not invalidated, this would fail because the module wouldn't be available
    expect(
      readFileSync(join(standaloneProjectPath, 'test-output.txt'), 'utf-8')
    ).toBe('Hello from shared-module!');
  }, 120000);
});
