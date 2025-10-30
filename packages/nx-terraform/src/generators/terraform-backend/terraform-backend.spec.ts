import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration } from '@nx/devkit';
import * as hcl2json from '@cdktf/hcl2json';

import { terraformBackendGenerator } from './terraform-backend';
import { TerraformBackendGeneratorSchema } from './schema';

describe('terraform-backend generator', () => {
  describe('aws-s3 backend', () => {
    const awsOptions: TerraformBackendGeneratorSchema = {
      name: 'tf-backend-aws',
      backendType: 'aws-s3',
    };

    it('should correctly generate project json', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, awsOptions);

      const config = readProjectConfiguration(tree, awsOptions.name);

      expect(config.name).toEqual(awsOptions.name);
      expect(config.projectType).toEqual('application');
      expect(
        tree.exists(`packages/${awsOptions.name}/.gitignore`)
      ).toBeTruthy();
    });

    it('should have correct backend config', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, awsOptions);

      const config = readProjectConfiguration(tree, awsOptions.name);

      expect(config.name).toEqual(awsOptions.name);
      expect(config.projectType).toEqual('application');

      expect(tree.read(`packages/${awsOptions.name}/main.tf`, 'utf-8')).toMatch(
        /bucket = /
      );
    });

    it('should use bucketNamePrefix when provided', async () => {
      const prefixOptions: TerraformBackendGeneratorSchema = {
        name: 'tf-backend-aws-prefix',
        backendType: 'aws-s3',
        bucketNamePrefix: 'myteam', // expects resulting local.tf to start with myteam- followed by interpolation
      };

      const tree = createTreeWithEmptyWorkspace();

      await terraformBackendGenerator(tree, prefixOptions);

      const result = await hcl2json.parse(
        'local.tf',
        tree.read(`packages/${prefixOptions.name}/locals.tf`, 'utf-8')
      );

      expect(result.locals[0].bucket_name).toMatch(/^myteam-.+/);
    });
  });

  describe('local backend', () => {
    const localOptions: TerraformBackendGeneratorSchema = {
      name: 'tf-backend-local',
      backendType: 'local',
    };

    it('should correctly generate project json', async () => {
      const tree = createTreeWithEmptyWorkspace();

      await terraformBackendGenerator(tree, localOptions);

      const config = readProjectConfiguration(tree, localOptions.name);

      expect(config.name).toEqual(localOptions.name);
      expect(config.projectType).toEqual('application');
      expect(
        tree.exists(`packages/${localOptions.name}/.gitignore`)
      ).toBeTruthy();
    });

    it('should have correct backend config', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformBackendGenerator(tree, localOptions);

      const config = readProjectConfiguration(tree, localOptions.name);

      expect(config.name).toEqual(localOptions.name);
      expect(config.projectType).toEqual('application');

      expect(
        tree.read(`packages/${localOptions.name}/main.tf`, 'utf-8')
      ).toMatch(/path = /);
    });
  });
});
