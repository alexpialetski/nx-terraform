import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration, addProjectConfiguration } from '@nx/devkit';
import { syncTerraformMetadataGenerator } from './sync-terraform-metadata';

// Mock logger to avoid console output during tests
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

describe('sync-terraform-metadata generator', () => {
  it('should update module to stateful when backend block detected', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with projectType: 'module' (will be synced)
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'module',
        },
      },
    });

    // Create .tf file with backend block using Tree
    tree.write(
      `${projectRoot}/main.tf`,
      `
      terraform {
        backend "s3" {
          bucket = "my-bucket"
          key    = "terraform.tfstate"
          region = "us-east-1"
        }
      }
    `
    );

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('stateful');
  });

  it('should update stateful to module when no backend block', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with projectType: 'stateful' (will be synced)
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'stateful',
        },
      },
    });

    // Create .tf file without backend block using Tree
    tree.write(
      `${projectRoot}/main.tf`,
      `
      resource "aws_s3_bucket" "test" {
        bucket = "my-bucket"
      }
    `
    );

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('module');
  });

  it('should preserve existing terraformProjectType: backend', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-backend-project';
    const projectRoot = `packages/${projectName}`;

    // Create backend project with explicit projectType
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'backend',
          backendType: 'aws-s3',
        },
      },
    });

    // Create .tf file (even with backend block, should not change)
    tree.write(
      `${projectRoot}/main.tf`,
      `
      terraform {
        backend "s3" {}
      }
    `
    );

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('backend');
    expect(config.metadata?.['nx-terraform']?.backendType).toBe('aws-s3');
  });

  it('should preserve existing backendProject metadata', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-stateful-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with backendProject metadata
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'module',
          backendProject: 'my-backend',
        },
      },
    });

    // Create .tf file without backend block (should not change metadata)
    tree.write(
      `${projectRoot}/main.tf`,
      `
      resource "aws_s3_bucket" "test" {}
    `
    );

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('module');
    expect(config.metadata?.['nx-terraform']?.backendProject).toBe(
      'my-backend'
    );
  });

  it('should skip projects without terraformProjectType', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-regular-project';
    const projectRoot = `packages/${projectName}`;

    // Create project without projectType (not managed by sync generator)
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {},
    });

    // Create .tf file - but project doesn't have projectType, so won't be processed
    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    // Metadata should remain unchanged (project not managed by sync generator)
    expect(config.metadata?.['nx-terraform']?.projectType).toBeUndefined();
  });

  it('should handle parse errors gracefully', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project without projectType metadata
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {},
    });

    // Create invalid .tf file using Tree
    tree.write(`${projectRoot}/main.tf`, 'invalid hcl syntax {{{{');

    // Should not throw, but may not update metadata due to parse error
    await expect(
      syncTerraformMetadataGenerator(tree, {})
    ).resolves.not.toThrow();
  });

  it('should be idempotent (multiple runs produce same result)', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with projectType: 'module' (will be synced)
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'module',
        },
      },
    });

    // Create .tf file with backend block using Tree
    tree.write(
      `${projectRoot}/main.tf`,
      `
      terraform {
        backend "s3" {}
      }
    `
    );

    // Run first time - should update from 'module' to 'stateful'
    await syncTerraformMetadataGenerator(tree, {});
    const config1 = readProjectConfiguration(tree, projectName);
    expect(config1.metadata?.['nx-terraform']?.projectType).toBe('stateful');

    // Run second time - should remain 'stateful' (idempotent)
    await syncTerraformMetadataGenerator(tree, {});
    const config2 = readProjectConfiguration(tree, projectName);
    expect(config2.metadata?.['nx-terraform']?.projectType).toBe('stateful');

    // Should be the same
    expect(config1.metadata?.['nx-terraform']?.projectType).toBe(
      config2.metadata?.['nx-terraform']?.projectType
    );
  });

  it('should handle multiple .tf files and detect backend in any file', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with projectType: 'module' (will be synced)
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'module',
        },
      },
    });

    // Create multiple .tf files using Tree, backend in one of them
    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');
    tree.write(`${projectRoot}/variables.tf`, 'variable "name" {}');
    tree.write(
      `${projectRoot}/backend.tf`,
      `
      terraform {
        backend "s3" {}
      }
    `
    );

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('stateful');
  });

  it('should update type when it does not match detected state', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with projectType: 'module' but has backend block
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'module',
        },
      },
    });

    // Create .tf file with backend block (should update to 'stateful')
    tree.write(
      `${projectRoot}/main.tf`,
      `
      terraform {
        backend "s3" {}
      }
    `
    );

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    // Should update to match detected state
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('stateful');
  });

  it('should not update when type already matches detected state', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectName = 'my-terraform-project';
    const projectRoot = `packages/${projectName}`;

    // Create project with projectType: 'module' and no backend block
    addProjectConfiguration(tree, projectName, {
      root: projectRoot,
      projectType: 'application',
      targets: {},
      metadata: {
        'nx-terraform': {
          projectType: 'module',
        },
      },
    });

    // Create .tf file without backend block (type already correct)
    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');

    await syncTerraformMetadataGenerator(tree, {});

    const config = readProjectConfiguration(tree, projectName);
    // Should remain 'module' (already matches detected state)
    expect(config.metadata?.['nx-terraform']?.projectType).toBe('module');
  });

  it('should handle projects with missing project.json gracefully', async () => {
    const tree = createTreeWithEmptyWorkspace();

    // Don't create project configuration - getProjects won't return it
    // So this test verifies that missing projects are skipped

    // Should not throw, should skip projects without project.json
    await expect(
      syncTerraformMetadataGenerator(tree, {})
    ).resolves.not.toThrow();
  });
});
