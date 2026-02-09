import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration } from '@nx/devkit';

import { terraformModuleGenerator } from './terraform-module';
import { TerraformModuleGeneratorSchema } from './schema';
import { terraformBackendGenerator } from '../terraform-backend/terraform-backend';

describe('terraform-module generator', () => {
  describe('simple module', () => {
    const simpleModuleOptions: TerraformModuleGeneratorSchema = {
      name: 'my-terraform-module',
    };

    it('should correctly generate project json', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      const config = readProjectConfiguration(tree, simpleModuleOptions.name);

      expect(config.name).toEqual(simpleModuleOptions.name);
      expect(config.projectType).toEqual('application');
      expect(config.metadata?.['nx-terraform']?.projectType).toEqual('module');
      expect(config.targets?.['terraform-init']).toBeUndefined();
      expect(config.implicitDependencies).toBeUndefined();
    });

    it('should generate main.tf file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/main.tf`)
      ).toBeTruthy();
      const mainTfContent = tree.read(
        `packages/${simpleModuleOptions.name}/main.tf`,
        'utf-8'
      );
      expect(mainTfContent).toContain('Terraform Module: my-terraform-module');
    });

    it('should generate variables.tf file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/variables.tf`)
      ).toBeTruthy();
    });

    it('should generate outputs.tf file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/outputs.tf`)
      ).toBeTruthy();
    });

    it('should generate README.md file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/README.md`)
      ).toBeTruthy();
      const readmeContent = tree.read(
        `packages/${simpleModuleOptions.name}/README.md`,
        'utf-8'
      );
      expect(readmeContent).toContain('my-terraform-module');
    });

    it('should generate .gitignore file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/.gitignore`)
      ).toBeTruthy();
    });

    it('should not generate backend.tf file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/backend.tf`)
      ).toBeFalsy();
    });

    it('should not generate provider.tf file', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      expect(
        tree.exists(`packages/${simpleModuleOptions.name}/provider.tf`)
      ).toBeFalsy();
    });
  });

  describe('stateful module (application with backend)', () => {
    const backendName = 'terraform-backend';

    it('should correctly generate project json as application', async () => {
      const tree = createTreeWithEmptyWorkspace();
      const statefulModuleOptions: TerraformModuleGeneratorSchema = {
        name: 'my-stateful-module',
        backendProject: backendName,
      };

      // Create backend project first
      await terraformBackendGenerator(tree, {
        name: backendName,
        backendType: 'aws-s3',
      });

      await terraformModuleGenerator(tree, statefulModuleOptions);

      const config = readProjectConfiguration(tree, statefulModuleOptions.name);

      expect(config.name).toEqual(statefulModuleOptions.name);
      expect(config.projectType).toEqual('application');
      expect(config.metadata?.['nx-terraform']?.projectType).toEqual('module');
      expect(
        (config.targets?.['terraform-init']?.metadata as { backendProject?: string })
          ?.backendProject
      ).toEqual(backendName);
      // Note: implicitDependencies are now created by createDependencies API
      expect(config.implicitDependencies).toBeUndefined();
    });

    describe('with aws-s3 backend', () => {
      const statefulModuleOptions: TerraformModuleGeneratorSchema = {
        name: 'my-stateful-module-aws',
        backendProject: backendName,
      };

      it('should throw error if backend project does not exist', async () => {
        const tree = createTreeWithEmptyWorkspace();

        await expect(
          terraformModuleGenerator(tree, statefulModuleOptions)
        ).rejects.toThrow(`Cannot find configuration for '${backendName}'`);
      });

      it('should throw error if backend project is missing backendType in metadata', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project without backendType in metadata
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        // Manually remove backendType from metadata to simulate old backend project
        const backendConfig = readProjectConfiguration(tree, backendName);
        if (backendConfig.metadata?.['nx-terraform']) {
          delete backendConfig.metadata['nx-terraform'].backendType;
        }
        tree.write(
          `packages/${backendName}/project.json`,
          JSON.stringify(backendConfig, null, 2)
        );

        await expect(
          terraformModuleGenerator(tree, statefulModuleOptions)
        ).rejects.toThrow(
          `Backend project "${backendName}" is missing backendType in metadata. Please recreate it using the terraform-backend generator.`
        );
      });

      it('should generate main.tf file', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/main.tf`)
        ).toBeTruthy();
        const mainTfContent = tree.read(
          `packages/${statefulModuleOptions.name}/main.tf`,
          'utf-8'
        );
        expect(mainTfContent).toContain('my-stateful-module-aws');
        expect(mainTfContent).toContain('stateful Terraform module');
      });

      it('should generate backend.tf file with s3 backend', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/backend.tf`)
        ).toBeTruthy();
        const backendTfContent = tree.read(
          `packages/${statefulModuleOptions.name}/backend.tf`,
          'utf-8'
        );
        expect(backendTfContent).toContain('backend "s3"');
      });

      it('should generate provider.tf file', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/provider.tf`)
        ).toBeTruthy();
      });

      it('should generate README.md file with AWS S3 backend reference', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/README.md`)
        ).toBeTruthy();
        const readmeContent = tree.read(
          `packages/${statefulModuleOptions.name}/README.md`,
          'utf-8'
        );
        expect(readmeContent).toContain('my-stateful-module-aws');
        expect(readmeContent).toContain(backendName);
        expect(readmeContent).toContain('backend.config');
        expect(readmeContent).toContain('AWS S3');
      });
    });

    describe('with local backend', () => {
      const statefulModuleOptions: TerraformModuleGeneratorSchema = {
        name: 'my-stateful-module-local',
        backendProject: backendName,
      };

      it('should generate backend.tf file with local backend', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'local',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/backend.tf`)
        ).toBeTruthy();
        const backendTfContent = tree.read(
          `packages/${statefulModuleOptions.name}/backend.tf`,
          'utf-8'
        );
        expect(backendTfContent).toContain('backend "local"');
      });

      it('should generate README.md file with local backend reference', async () => {
        const tree = createTreeWithEmptyWorkspace();

        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'local',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/README.md`)
        ).toBeTruthy();
        const readmeContent = tree.read(
          `packages/${statefulModuleOptions.name}/README.md`,
          'utf-8'
        );
        expect(readmeContent).toContain('my-stateful-module-local');
        expect(readmeContent).toContain(backendName);
        expect(readmeContent).toContain('backend.config');
        expect(readmeContent).toContain('local');
      });
    });
  });
});
