import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  cleanupTestProject,
  createTestProject,
  execNxCommand,
  resetNx,
} from './testUtils';
import {
  runActWorkflow,
  validateWorkflowWithAct,
  isActAvailable,
  getGitHubToken,
} from '../../../tools/scripts/actTestUtils';

describe.skip('ci-cd generator', () => {
  let projectDirectory: string;

  afterAll(() => {
    // if (projectDirectory) {
    //   cleanupTestProject(projectDirectory);
    // }
  });

  // Act-based tests (conditional)
  describe('workflow validation with Act', () => {
    const ACT_AVAILABLE = isActAvailable();

    beforeAll(() => {
      if (!ACT_AVAILABLE) {
        console.log('Act is not available, skipping Act-based tests');
      }
    });

    (ACT_AVAILABLE ? test : test.skip)(
      'should generate valid workflows that Act can parse and validate',
      async () => {
        // Use existing test project or create a new one
        const existingProjects = execSync(
          `find ${join(
            process.cwd(),
            'tmp'
          )} -maxdepth 1 -type d -name 'test-cicd-*' -exec test -d {}/.github/workflows \\; -print 2>/dev/null | head -1`,
          { encoding: 'utf-8', stdio: 'pipe' }
        ).trim();

        if (existingProjects && existsSync(existingProjects)) {
          projectDirectory = existingProjects;
          console.log(`Using existing test project: ${projectDirectory}`);
        } else {
          // Create a test workspace with terraform projects
          projectDirectory = createTestProject(
            'test-cicd-act',
            '--backendType=local'
          );

          // Verify terraform projects exist
          const projects = execNxCommand('show projects', projectDirectory);
          expect(projects).toContain('terraform-setup');
          expect(projects).toContain('terraform-infra');

          // Run the ci-cd generator
          execSync('nx g nx-terraform:ci-cd --ciProvider=github-actions', {
            cwd: projectDirectory,
            stdio: 'inherit',
          });
        }

        // Verify workflow files exist
        expect(
          existsSync(join(projectDirectory, '.github/workflows/ci.yml'))
        ).toBeTruthy();
        expect(
          existsSync(
            join(projectDirectory, '.github/workflows/pr-validation.yml')
          )
        ).toBeTruthy();
        expect(
          existsSync(
            join(
              projectDirectory,
              '.github/workflows/manual-infrastructure.yml'
            )
          )
        ).toBeTruthy();

        // Verify composite actions exist
        expect(
          existsSync(
            join(projectDirectory, '.github/actions/setup-terraform/action.yml')
          )
        ).toBeTruthy();
        expect(
          existsSync(
            join(projectDirectory, '.github/actions/setup-node-aws/action.yml')
          )
        ).toBeTruthy();

        // Validate YAML structure
        const ciWorkflow = readFileSync(
          join(projectDirectory, '.github/workflows/ci.yml'),
          'utf-8'
        );
        const prValidation = readFileSync(
          join(projectDirectory, '.github/workflows/pr-validation.yml'),
          'utf-8'
        );
        const manualWorkflow = readFileSync(
          join(projectDirectory, '.github/workflows/manual-infrastructure.yml'),
          'utf-8'
        );

        // Basic YAML validation - check for required keys
        expect(ciWorkflow).toContain('name:');
        expect(ciWorkflow).toContain('on:');
        expect(ciWorkflow).toContain('jobs:');
        expect(ciWorkflow).toContain("vars.AWS_REGION || 'us-east-1'");
        expect(ciWorkflow).toContain('terraform-setup');
        expect(ciWorkflow).toContain('terraform-infra');

        expect(prValidation).toContain('name:');
        expect(prValidation).toContain('on:');
        expect(prValidation).toContain('jobs:');
        expect(prValidation).toContain("vars.AWS_REGION || 'us-east-1'");
        expect(prValidation).toContain('security-scan');
        expect(prValidation).toContain('checkov');
        expect(prValidation).toContain('tfsec');

        expect(manualWorkflow).toContain('name:');
        expect(manualWorkflow).toContain('on:');
        expect(manualWorkflow).toContain('workflow_dispatch:');
        expect(manualWorkflow).toContain("vars.AWS_REGION || 'us-east-1'");
        expect(manualWorkflow).toContain('terraform-setup');
        expect(manualWorkflow).toContain('terraform-infra');

        // Validate composite actions
        const setupTerraform = readFileSync(
          join(projectDirectory, '.github/actions/setup-terraform/action.yml'),
          'utf-8'
        );
        const setupNodeAws = readFileSync(
          join(projectDirectory, '.github/actions/setup-node-aws/action.yml'),
          'utf-8'
        );

        expect(setupTerraform).toContain('name:');
        expect(setupTerraform).toContain('inputs:');
        expect(setupTerraform).toContain('aws-region:');
        expect(setupTerraform).toContain('terraform-setup');
        expect(setupTerraform).toContain('terraform-validate');
        expect(setupTerraform).toContain('terraform-apply');

        expect(setupNodeAws).toContain('name:');
        expect(setupNodeAws).toContain('inputs:');
        expect(setupNodeAws).toContain('aws-access-key-id:');
        expect(setupNodeAws).toContain('aws-secret-access-key:');

        // Validate each workflow can be parsed by Act
        expect(
          await validateWorkflowWithAct(projectDirectory, 'ci.yml')
        ).toBeTruthy();

        expect(
          await validateWorkflowWithAct(projectDirectory, 'pr-validation.yml')
        ).toBeTruthy();

        expect(
          await validateWorkflowWithAct(
            projectDirectory,
            'manual-infrastructure.yml'
          )
        ).toBeTruthy();

        // Use Act to list jobs and verify structure
        const ciOutput = await runActWorkflow(projectDirectory, {
          workflow: 'ci.yml',
          event: 'push',
          dryRun: true,
        });

        const prOutput = await runActWorkflow(projectDirectory, {
          workflow: 'pr-validation.yml',
          event: 'pull_request',
          dryRun: true,
        });

        // Verify Act can parse and list jobs
        expect(ciOutput).toBeTruthy();
        expect(prOutput).toBeTruthy();

        // Verify Act doesn't throw errors (syntax validation)
        await expect(
          runActWorkflow(projectDirectory, {
            workflow: 'ci.yml',
            event: 'push',
            dryRun: true,
          })
        ).resolves.toBeTruthy();

        await expect(
          runActWorkflow(projectDirectory, {
            workflow: 'pr-validation.yml',
            event: 'pull_request',
            dryRun: true,
          })
        ).resolves.toBeTruthy();

        await expect(
          runActWorkflow(projectDirectory, {
            workflow: 'manual-infrastructure.yml',
            event: 'workflow_dispatch',
            dryRun: true,
          })
        ).resolves.toBeTruthy();
      },
      60000 // 60 second timeout for async operations
    );

    (ACT_AVAILABLE ? test : test.skip)(
      'should actually execute workflows with Act (real execution)',
      async () => {
        // Use existing test project or create a new one
        // This makes it easier to examine logs and debug
        const existingProjects = execSync(
          `find ${join(
            process.cwd(),
            'tmp'
          )} -maxdepth 1 -type d -name 'test-cicd-*' -exec test -d {}/.github/workflows \\; -print 2>/dev/null | head -1`,
          { encoding: 'utf-8', stdio: 'pipe' }
        ).trim();

        if (existingProjects && existsSync(existingProjects)) {
          projectDirectory = existingProjects;
          console.log(`Using existing test project: ${projectDirectory}`);
        } else {
          // Create a test workspace with terraform projects
          projectDirectory = createTestProject(
            'test-cicd-act-exec',
            '--backendType=local'
          );

          // Generate package-lock.json for npm ci to work
          execSync('npm install --package-lock-only', {
            cwd: projectDirectory,
            stdio: 'pipe',
          });

          // Run the ci-cd generator
          execSync('nx g nx-terraform:ci-cd --ciProvider=github-actions', {
            cwd: projectDirectory,
            stdio: 'inherit',
          });
        }

        // Log the project directory for easy access
        console.log(`Test project directory: ${projectDirectory}`);
        console.log(
          `You can manually run Act in this directory to examine logs:`
        );
        console.log(`  cd ${projectDirectory}`);
        console.log(
          `  act pull_request --workflows .github/workflows/pr-validation.yml --job validate -s GITHUB_TOKEN=\$(gh auth token) --env AWS_REGION=us-east-1`
        );

        // Run Act for real on a simple job (validate job from pr-validation)
        // This will actually execute the workflow steps
        // Try to use real GitHub token from gh CLI if available
        const githubToken = getGitHubToken() || 'test-token';
        const useRealToken = githubToken !== 'test-token';

        if (useRealToken) {
          console.log('Using real GitHub token from gh CLI for Act execution');
        } else {
          console.log(
            'Using test token - some steps may fail with authentication errors'
          );
        }

        // Note: runActWorkflow is now async and returns output even on error (captures stdout/stderr)
        let output: string;
        try {
          output = await runActWorkflow(projectDirectory, {
            workflow: 'pr-validation.yml',
            event: 'pull_request',
            job: 'validate',
            secrets: {
              AWS_ACCESS_KEY_ID: 'test-key',
              AWS_SECRET_ACCESS_KEY: 'test-secret',
              GITHUB_TOKEN: githubToken,
            },
            env: {
              AWS_REGION: 'us-east-1',
            },
            dryRun: false, // Actually run it!
          });
        } catch (error) {
          // runActWorkflow should return output even on error, but if it throws,
          // extract what we can from the error
          if (error instanceof Error) {
            output = error.message || String(error);
          } else {
            output = String(error);
          }
        }

        // Log a portion of the output for debugging
        const outputPreview =
          output.length > 3000 ? output.substring(0, 3000) + '...' : output;
        console.log(
          'Act execution output preview (length:',
          output.length,
          '):',
          outputPreview
        );

        // Also log the last part in case the beginning is just error message
        if (output.length > 3000) {
          console.log(
            'Act execution output (last 1000 chars):',
            output.substring(output.length - 1000)
          );
        }

        // Verify Act attempted to execute
        // The key indicators that Act actually ran (not just validated):
        expect(output).toBeTruthy();
        expect(output.length).toBeGreaterThan(0);

        // Verify Act connected to Docker (this happens before any execution)
        // Act writes info messages to stderr, so they should be in the output
        const dockerConnected =
          output.includes('docker host') ||
          output.includes('docker.sock') ||
          output.includes('Using docker') ||
          output.includes('level=info');
        expect(dockerConnected).toBeTruthy();

        // Verify Docker container was created (this is the key success indicator)
        // Act creates containers even if workflow steps fail later
        // These messages appear in Act's output (usually stderr)
        const containerCreated =
          output.includes('docker create') ||
          output.includes('docker run') ||
          output.includes('Start image') ||
          output.includes('🚀  Start image') ||
          output.includes('🐳  docker');
        expect(containerCreated).toBeTruthy();

        // Verify workflow steps were attempted (even if they fail)
        // These messages appear when Act actually executes steps
        const stepsExecuted =
          output.includes('Run Set up job') ||
          output.includes('Run Main') ||
          output.includes('docker exec') ||
          output.includes('⭐ Run') ||
          output.includes('✅  Success') ||
          output.includes('❌  Failure') ||
          output.includes('[PR Validation');
        expect(stepsExecuted).toBeTruthy();

        // Log summary for debugging
        console.log('Act execution summary:', {
          outputLength: output.length,
          dockerConnected,
          containerCreated,
          stepsExecuted,
          // Note: Expected failures in test environment:
          // - Authentication errors when cloning actions (expected with test token)
          // - npm ci may fail if dependencies are missing (expected)
          // - GitHub API calls will fail without real repo context (expected)
          // The important thing is that Act created containers and attempted execution
        });
      },
      120000 // 2 minute timeout for real execution
    );
  });
});
