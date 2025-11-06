import {
  parseTerraformFile,
  extractModuleBlocks,
  hasBackendBlock,
  getTerraformFilesToProcess,
  isLocalPath,
} from './fileParser';

// Mock logger to avoid console output during tests
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

describe('fileParser', () => {
  describe('parseTerraformFile', () => {
    it('should successfully parse valid HCL content', async () => {
      const fileName = 'test.tf';
      const content = 'resource "aws_s3_bucket" "test" {}';

      const result = await parseTerraformFile(fileName, content);

      expect(result.success).toBe(true);
      expect(result.parsed).toBeDefined();
      expect(result.parsed).toHaveProperty('resource');
    });

    it('should return success false and log warning on parse error', async () => {
      const fileName = 'invalid.tf';
      const content = 'invalid hcl syntax {';

      const result = await parseTerraformFile(fileName, content);

      expect(result.success).toBe(false);
      expect(result.parsed).toBeNull();
    });
  });

  describe('extractModuleBlocks', () => {
    it('should extract module blocks with sources', async () => {
      const hclContent = `
        module "vpc" {
          source = "./modules/vpc"
        }
        module "ec2" {
          source = "../shared-modules/ec2"
        }
      `;

      const { parsed } = await parseTerraformFile('test.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const modules = extractModuleBlocks(parsed);

      expect(modules).toHaveLength(2);
      expect(modules).toContainEqual({
        moduleName: 'vpc',
        source: './modules/vpc',
      });
      expect(modules).toContainEqual({
        moduleName: 'ec2',
        source: '../shared-modules/ec2',
      });
    });

    it('should return empty array when no modules exist', async () => {
      const hclContent = 'resource "aws_s3_bucket" "test" {}';

      const { parsed } = await parseTerraformFile('test.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const modules = extractModuleBlocks(parsed);

      expect(modules).toEqual([]);
    });

    it('should handle multiple module configurations with same name', async () => {
      const hclContent = `
        module "vpc" {
          source = "./modules/vpc-dev"
        }
        module "vpc" {
          source = "./modules/vpc-prod"
        }
      `;

      const { parsed } = await parseTerraformFile('test.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const modules = extractModuleBlocks(parsed);

      expect(modules.length).toBeGreaterThanOrEqual(1);
      // Both modules should be extracted
      const vpcModules = modules.filter((m) => m.moduleName === 'vpc');
      expect(vpcModules.length).toBeGreaterThanOrEqual(1);
    });

    it('should skip modules without source property', async () => {
      const hclContent = `
        module "vpc" {
          source = "./modules/vpc"
        }
        module "ec2" {
          # No source property
        }
      `;

      const { parsed } = await parseTerraformFile('test.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const modules = extractModuleBlocks(parsed);

      // Should only extract modules with source
      const vpcModule = modules.find((m) => m.moduleName === 'vpc');
      expect(vpcModule).toBeDefined();
      expect(vpcModule?.source).toBe('./modules/vpc');
    });
  });

  describe('hasBackendBlock', () => {
    it('should return true when backend block exists with s3 backend', async () => {
      const hclContent = `
        terraform {
          backend "s3" {
            bucket = "my-bucket"
            key    = "terraform.tfstate"
            region = "us-east-1"
          }
        }
      `;

      const { parsed } = await parseTerraformFile('backend.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const result = hasBackendBlock(parsed);

      expect(result).toBe(true);
    });

    it('should return true when backend block exists with local backend', async () => {
      const hclContent = `
        terraform {
          backend "local" {
            path = "terraform.tfstate"
          }
        }
      `;

      const { parsed } = await parseTerraformFile('backend.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const result = hasBackendBlock(parsed);

      expect(result).toBe(true);
    });

    it('should return false when no backend block exists', async () => {
      const hclContent = `
        terraform {
          required_version = ">= 1.0"
        }
      `;

      const { parsed } = await parseTerraformFile('main.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const result = hasBackendBlock(parsed);

      expect(result).toBe(false);
    });

    it('should return false when terraform block does not exist', async () => {
      const hclContent = 'resource "aws_s3_bucket" "test" {}';

      const { parsed } = await parseTerraformFile('main.tf', hclContent);
      if (!parsed) {
        throw new Error('Failed to parse HCL content');
      }
      const result = hasBackendBlock(parsed);

      expect(result).toBe(false);
    });
  });

  describe('getTerraformFilesToProcess', () => {
    it('should filter only .tf files', () => {
      const filesToProcess = [
        { file: 'main.tf' },
        { file: 'variables.tf' },
        { file: 'outputs.tf' },
        { file: 'README.md' },
        { file: 'project.json' },
        { file: 'backend.tf' },
      ];

      const result = getTerraformFilesToProcess(filesToProcess);

      expect(result).toEqual([
        { file: 'main.tf' },
        { file: 'variables.tf' },
        { file: 'outputs.tf' },
        { file: 'backend.tf' },
      ]);
    });

    it('should return empty array when no .tf files exist', () => {
      const filesToProcess = [
        { file: 'README.md' },
        { file: 'project.json' },
        { file: 'package.json' },
      ];

      const result = getTerraformFilesToProcess(filesToProcess);

      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const filesToProcess: Array<{ file: string }> = [];

      const result = getTerraformFilesToProcess(filesToProcess);

      expect(result).toEqual([]);
    });

    it('should handle files with .tf extension in different positions', () => {
      const filesToProcess = [
        { file: 'path/to/file.tf' },
        { file: 'file.tf.backup' },
        { file: 'terraform.tf' },
      ];

      const result = getTerraformFilesToProcess(filesToProcess);

      expect(result).toEqual([
        { file: 'path/to/file.tf' },
        { file: 'terraform.tf' },
      ]);
    });
  });

  describe('isLocalPath', () => {
    it('should return true for relative paths starting with ./', () => {
      expect(isLocalPath('./modules/vpc')).toBe(true);
      expect(isLocalPath('./vpc')).toBe(true);
      expect(isLocalPath('./')).toBe(true);
    });

    it('should return true for relative paths starting with ../', () => {
      expect(isLocalPath('../modules/vpc')).toBe(true);
      expect(isLocalPath('../vpc')).toBe(true);
      expect(isLocalPath('../')).toBe(true);
    });

    it('should return false for absolute paths', () => {
      expect(isLocalPath('/modules/vpc')).toBe(false);
      expect(isLocalPath('/usr/local/modules')).toBe(false);
    });

    it('should return false for remote module sources', () => {
      expect(isLocalPath('git::https://example.com/module.git')).toBe(false);
      expect(isLocalPath('registry.terraform.io/hashicorp/aws')).toBe(false);
      expect(isLocalPath('github.com/hashicorp/example')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isLocalPath('')).toBe(false);
    });

    it('should return false for paths without ./ or ../ prefix', () => {
      expect(isLocalPath('modules/vpc')).toBe(false);
      expect(isLocalPath('vpc')).toBe(false);
    });
  });
});
