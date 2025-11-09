import { TerraformFileParser } from '../TerraformFileParser';
import { TerraformFile } from '../TerraformFile';

// Mock logger to avoid console output during tests
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

/**
 * Test implementation of TerraformFileParser for testing purposes
 */
class TestTerraformFileParser extends TerraformFileParser {
  private readonly fileMap: Map<string, string>;

  constructor(fileMap: Map<string, string>) {
    super();
    this.fileMap = fileMap;
  }

  protected findTerraformFiles(): string[] {
    return Array.from(this.fileMap.keys());
  }

  protected async readTerraformFile(
    filePath: string
  ): Promise<{ content: string; success: boolean }> {
    const content = this.fileMap.get(filePath);
    if (content === undefined) {
      return { content: '', success: false };
    }
    return { content, success: true };
  }
}

/**
 * Helper function to parse Terraform files from a map and return an array of TerraformFile instances
 */
async function parseTerraformFiles(
  fileMap: Map<string, string>
): Promise<TerraformFile[]> {
  const parser = new TestTerraformFileParser(fileMap);
  const files: TerraformFile[] = [];
  for await (const file of parser) {
    files.push(file);
  }
  return files;
}

describe('TerraformFile', () => {
  describe('extractModules', () => {
    it('should extract module blocks with source and version', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          module "vpc" {
            source  = "./modules/vpc"
            version = "1.0.0"
          }
          module "ec2" {
            source = "../shared-modules/ec2"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const modules = files[0].extractModules();
      expect(modules).toHaveLength(2);
      expect(modules).toEqual(
        expect.arrayContaining([
          {
            name: 'vpc',
            source: './modules/vpc',
            version: '1.0.0',
          },
          {
            name: 'ec2',
            source: '../shared-modules/ec2',
            version: undefined,
          },
        ])
      );
    });

    it('should return empty array when no modules exist', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          resource "aws_s3_bucket" "test" {
            bucket = "test-bucket"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const modules = files[0].extractModules();
      expect(modules).toEqual([]);
    });

    it('should handle modules with multiple configurations', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          module "vpc" {
            source = "./modules/vpc"
          }
          module "vpc" {
            source = "./modules/vpc-alt"
            version = "2.0.0"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const modules = files[0].extractModules();
      expect(modules).toHaveLength(2);
      expect(modules[0].source).toBe('./modules/vpc');
      expect(modules[1].source).toBe('./modules/vpc-alt');
      expect(modules[1].version).toBe('2.0.0');
    });
  });

  describe('extractBackends', () => {
    it('should extract backend block names', async () => {
      const fileMap = new Map<string, string>([
        [
          'backend.tf',
          `
          terraform {
            backend "s3" {
              bucket = "my-terraform-state"
              key    = "terraform.tfstate"
            }
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const backends = files[0].extractBackends();
      expect(backends).toHaveLength(1);
      expect(backends[0]).toEqual({ name: 's3' });
    });

    it('should extract multiple backend blocks', async () => {
      const fileMap = new Map<string, string>([
        [
          'backend.tf',
          `
          terraform {
            backend "s3" {}
          }
          terraform {
            backend "local" {}
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const backends = files[0].extractBackends();
      expect(backends.length).toBeGreaterThanOrEqual(1);
      expect(backends.some((b) => b.name === 's3')).toBe(true);
    });

    it('should return empty array when no backend exists', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          resource "aws_s3_bucket" "test" {
            bucket = "test-bucket"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const backends = files[0].extractBackends();
      expect(backends).toEqual([]);
    });

    it('should return empty array when terraform block exists but has no backend', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          terraform {
            required_providers {
              aws = {
                source  = "hashicorp/aws"
                version = "~> 3.0"
              }
            }
          }
          
          resource "aws_s3_bucket" "test" {
            bucket = "test-bucket"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const backends = files[0].extractBackends();
      expect(backends).toEqual([]);
    });
  });

  describe('getParsedContent', () => {
    it('should return the raw parsed content', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          resource "aws_s3_bucket" "test" {
            bucket = "test-bucket"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const parsedContent = files[0].getParsedContent();
      expect(parsedContent).toBeDefined();
      expect(parsedContent).toHaveProperty('resource');
    });
  });

  describe('integration tests', () => {
    it('should extract all resource types from a complete Terraform file', async () => {
      const fileMap = new Map<string, string>([
        [
          'main.tf',
          `
          terraform {
            required_providers {
              aws = {
                source  = "hashicorp/aws"
                version = "~> 5.0"
              }
            }
            backend "s3" {
              bucket = "my-state"
            }
          }

          provider "aws" {
            version = "~> 3.0"
            region  = "us-east-1"
          }

          module "vpc" {
            source  = "./modules/vpc"
            version = "1.0.0"
          }

          resource "aws_s3_bucket" "test" {
            bucket = "test-bucket"
          }
        `,
        ],
      ]);

      const files = await parseTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const file = files[0];

      const modules = file.extractModules();
      expect(modules).toHaveLength(1);
      expect(modules[0]).toEqual({
        name: 'vpc',
        source: './modules/vpc',
        version: '1.0.0',
      });

      const backends = file.extractBackends();
      expect(backends.length).toBeGreaterThanOrEqual(1);
      expect(backends.some((b) => b.name === 's3')).toBe(true);
    });
  });
});
