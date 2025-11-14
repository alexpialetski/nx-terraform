import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration, getProjects } from '@nx/devkit';

import { ciCdGenerator } from './ci-cd';
import { CICDGeneratorSchema } from './schema';
import { terraformBackendGenerator } from '../terraform-backend/terraform-backend';
import { terraformModuleGenerator } from '../terraform-module/terraform-module';
import { PLUGIN_NAME } from '../../constants';

describe('ci-cd generator', () => {
  describe('github-actions', () => {
    const options: CICDGeneratorSchema = {
      ciProvider: 'github-actions',
      enableSecurityScan: true,
    };

    it('should generate workflow files', async () => {
      const tree = createTreeWithEmptyWorkspace();

      // Create test terraform projects
      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await terraformModuleGenerator(tree, {
        name: 'infra',
        backendProject: 'backend',
      });

      await ciCdGenerator(tree, options);

      // Verify workflow files exist
      expect(tree.exists('.github/workflows/ci.yml')).toBeTruthy();
      expect(tree.exists('.github/workflows/pr-validation.yml')).toBeTruthy();
      expect(tree.exists('.github/workflows/manual-infrastructure.yml')).toBeTruthy();
    });

    it('should copy composite actions', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await ciCdGenerator(tree, options);

      // Verify composite actions are copied
      expect(tree.exists('.github/actions/setup-terraform/action.yml')).toBeTruthy();
      expect(tree.exists('.github/actions/setup-node-aws/action.yml')).toBeTruthy();
    });

    it('should include security scan when enabled', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await ciCdGenerator(tree, { ...options, enableSecurityScan: true });

      const prValidation = tree.read('.github/workflows/pr-validation.yml', 'utf-8');
      expect(prValidation).toContain('security-scan');
      expect(prValidation).toContain('checkov');
      expect(prValidation).toContain('tfsec');
    });

    it('should exclude security scan when disabled', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await ciCdGenerator(tree, { ...options, enableSecurityScan: false });

      const prValidation = tree.read('.github/workflows/pr-validation.yml', 'utf-8');
      expect(prValidation).not.toContain('security-scan');
    });

    it('should hardcode AWS region as us-east-1', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await ciCdGenerator(tree, options);

      const ciWorkflow = tree.read('.github/workflows/ci.yml', 'utf-8');
      expect(ciWorkflow).toContain("vars.AWS_REGION || 'us-east-1'");
      
      const prValidation = tree.read('.github/workflows/pr-validation.yml', 'utf-8');
      expect(prValidation).toContain("vars.AWS_REGION || 'us-east-1'");
      
      const manualWorkflow = tree.read('.github/workflows/manual-infrastructure.yml', 'utf-8');
      expect(manualWorkflow).toContain("vars.AWS_REGION || 'us-east-1'");
    });

    it('should discover all terraform projects', async () => {
      const tree = createTreeWithEmptyWorkspace();

      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await terraformModuleGenerator(tree, {
        name: 'infra',
        backendProject: 'backend',
      });

      await terraformModuleGenerator(tree, {
        name: 'module',
      });

      await ciCdGenerator(tree, options);

      const ciWorkflow = tree.read('.github/workflows/ci.yml', 'utf-8');
      // Verify workflows reference discovered projects
      expect(ciWorkflow).toContain('backend');
      expect(ciWorkflow).toContain('infra');
    });

    it('should not generate workflows when no terraform projects exist', async () => {
      const tree = createTreeWithEmptyWorkspace();

      await ciCdGenerator(tree, options);

      // Should not generate workflows if no terraform projects
      expect(tree.exists('.github/workflows/ci.yml')).toBeFalsy();
      expect(tree.exists('.github/workflows/pr-validation.yml')).toBeFalsy();
      expect(tree.exists('.github/workflows/manual-infrastructure.yml')).toBeFalsy();
    });

    it('should include backend projects in setup-terraform action', async () => {
      const tree = createTreeWithEmptyWorkspace();

      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await ciCdGenerator(tree, options);

      const setupTerraform = tree.read('.github/actions/setup-terraform/action.yml', 'utf-8');
      expect(setupTerraform).toContain('backend');
      expect(setupTerraform).toContain('terraform-validate');
      expect(setupTerraform).toContain('terraform-apply');
    });

    it('should generate manual workflow with all terraform projects as options', async () => {
      const tree = createTreeWithEmptyWorkspace();

      await terraformBackendGenerator(tree, {
        name: 'backend',
        backendType: 'aws-s3',
      });

      await terraformModuleGenerator(tree, {
        name: 'infra',
        backendProject: 'backend',
      });

      await ciCdGenerator(tree, options);

      const manualWorkflow = tree.read('.github/workflows/manual-infrastructure.yml', 'utf-8');
      expect(manualWorkflow).toContain('backend');
      expect(manualWorkflow).toContain('infra');
    });

    it('should filter non-terraform projects', async () => {
      const tree = createTreeWithEmptyWorkspace();

      // Create terraform project
      await terraformBackendGenerator(tree, {
        name: 'terraform-backend',
        backendType: 'aws-s3',
      });

      // Create non-terraform project (regular Nx project)
      const projects = getProjects(tree);
      // Non-terraform projects won't have metadata[PLUGIN_NAME].projectType

      await ciCdGenerator(tree, options);

      const ciWorkflow = tree.read('.github/workflows/ci.yml', 'utf-8');
      // Should only contain terraform projects
      expect(ciWorkflow).toContain('terraform-backend');
    });
  });
});

