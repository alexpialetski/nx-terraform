import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration } from '@nx/devkit';

import { terraformModuleGenerator } from './terraform-module';
import { TerraformModuleGeneratorSchema } from './schema';
import { terraformBackendGenerator } from '../terraform-backend/terraform-backend';

describe('terraform-module generator', () => {
  describe('simple module (library)', () => {
    const simpleModuleOptions: TerraformModuleGeneratorSchema = {
      name: 'my-terraform-module',
      backendType: 'local', // Required by schema, but not used for simple modules
    };

    it('should correctly generate project json as library', async () => {
      const tree = createTreeWithEmptyWorkspace();
      await terraformModuleGenerator(tree, simpleModuleOptions);

      const config = readProjectConfiguration(tree, simpleModuleOptions.name);

      expect(config.name).toEqual(simpleModuleOptions.name);
      expect(config.projectType).toEqual('library');
      expect(config.metadata).toBeUndefined();
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
    
    describe('with aws-s3 backend', () => {
      const statefulModuleOptions: TerraformModuleGeneratorSchema = {
        name: 'my-stateful-module-aws',
        backendProject: backendName,
        backendType: 'aws-s3',
      };

      it('should correctly generate project json as application', async () => {
        const tree = createTreeWithEmptyWorkspace();
        
        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        const config = readProjectConfiguration(tree, statefulModuleOptions.name);

        expect(config.name).toEqual(statefulModuleOptions.name);
        expect(config.projectType).toEqual('application');
        expect(config.metadata?.backendProject).toEqual(backendName);
        // Note: implicitDependencies are now created by createDependencies API
        expect(config.implicitDependencies).toBeUndefined();
      });

      it('should throw error if backend project does not exist', async () => {
        const tree = createTreeWithEmptyWorkspace();

        await expect(
          terraformModuleGenerator(tree, statefulModuleOptions)
        ).rejects.toThrow(
          `Backend project "${backendName}" not found. Please create it first using the terraform-backend generator.`
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

      it('should generate variables.tf file', async () => {
        const tree = createTreeWithEmptyWorkspace();
        
        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/variables.tf`)
        ).toBeTruthy();
      });

      it('should generate outputs.tf file', async () => {
        const tree = createTreeWithEmptyWorkspace();
        
        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/outputs.tf`)
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

      it('should generate .gitignore file', async () => {
        const tree = createTreeWithEmptyWorkspace();
        
        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'aws-s3',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        expect(
          tree.exists(`packages/${statefulModuleOptions.name}/.gitignore`)
        ).toBeTruthy();
      });
    });

    describe('with local backend', () => {
      const statefulModuleOptions: TerraformModuleGeneratorSchema = {
        name: 'my-stateful-module-local',
        backendProject: backendName,
        backendType: 'local',
      };

      it('should correctly generate project json as application', async () => {
        const tree = createTreeWithEmptyWorkspace();
        
        // Create backend project first
        await terraformBackendGenerator(tree, {
          name: backendName,
          backendType: 'local',
        });

        await terraformModuleGenerator(tree, statefulModuleOptions);

        const config = readProjectConfiguration(tree, statefulModuleOptions.name);

        expect(config.name).toEqual(statefulModuleOptions.name);
        expect(config.projectType).toEqual('application');
        expect(config.metadata?.backendProject).toEqual(backendName);
        // Note: implicitDependencies are now created by createDependencies API
        expect(config.implicitDependencies).toBeUndefined();
      });

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

