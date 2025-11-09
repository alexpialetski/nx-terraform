import { TerraformFileParser } from '../TerraformFileParser';
import { TerraformFile } from '../TerraformFile';
import { ProviderTerraformFile } from '../ProviderTerraformFile';

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

describe('TerraformFileParser', () => {
  it('should handle multiple files', async () => {
    const fileMap = new Map<string, string>([
      [
        'main.tf',
        `
        module "vpc" {
          source = "./modules/vpc"
        }
      `,
      ],
      [
        'backend.tf',
        `
        terraform {
          backend "s3" {}
        }
      `,
      ],
      [
        'provider.tf',
        `
        provider "aws" {
          version = "~> 3.0"
        }
      `,
      ],
    ]);

    const files = await parseTerraformFiles(fileMap);

    expect(files).toHaveLength(3);
    expect(files[0].fileName).toBe('main.tf');
    expect(files[1].fileName).toBe('backend.tf');
    expect(files[2].fileName).toBe('provider.tf');
  });

  it('should skip files that fail to read', async () => {
    // Create a custom parser that simulates a read failure for a specific file
    class FailingReadParser extends TerraformFileParser {
      protected findTerraformFiles(): string[] {
        return ['main.tf', 'invalid.tf'];
      }

      protected async readTerraformFile(
        filePath: string
      ): Promise<{ content: string; success: boolean }> {
        if (filePath === 'invalid.tf') {
          return { content: '', success: false };
        }
        return { content: 'resource "aws_s3_bucket" "test" {}', success: true };
      }
    }

    const parser = new FailingReadParser();
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('main.tf');
  });

  it('should skip files that fail to parse', async () => {
    const fileMap = new Map<string, string>([
      ['main.tf', 'resource "aws_s3_bucket" "test" {}'],
      ['invalid.tf', 'invalid hcl syntax {'],
    ]);

    const files = await parseTerraformFiles(fileMap);

    // Only the valid file should be parsed
    expect(files.length).toBeLessThanOrEqual(1);
    if (files.length > 0) {
      expect(files[0].fileName).toBe('main.tf');
    }
  });

  it('should handle empty file list', async () => {
    const fileMap = new Map<string, string>();
    const files = await parseTerraformFiles(fileMap);

    expect(files).toHaveLength(0);
  });

  it('should return ProviderTerraformFile for provider.tf files', async () => {
    const fileMap = new Map<string, string>([
      [
        'provider.tf',
        `
        terraform {
          required_providers {
            aws = {
              source  = "hashicorp/aws"
              version = "~> 5.0"
            }
          }
        }
        provider "aws" {
          region = "us-east-1"
        }
      `,
      ],
    ]);

    const files = await parseTerraformFiles(fileMap);

    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(ProviderTerraformFile);
    expect(files[0].fileName).toBe('provider.tf');
    
    const providerFile = files[0] as ProviderTerraformFile;
    expect(providerFile.providers).toHaveLength(1);
    expect(providerFile.providers[0].name).toBe('aws');
  });

  it('should return TerraformFile for non-provider.tf files', async () => {
    const fileMap = new Map<string, string>([
      [
        'main.tf',
        `
        module "vpc" {
          source = "./modules/vpc"
        }
      `,
      ],
      [
        'backend.tf',
        `
        terraform {
          backend "s3" {}
        }
      `,
      ],
    ]);

    const files = await parseTerraformFiles(fileMap);

    expect(files).toHaveLength(2);
    expect(files[0]).toBeInstanceOf(TerraformFile);
    expect(files[0]).not.toBeInstanceOf(ProviderTerraformFile);
    expect(files[1]).toBeInstanceOf(TerraformFile);
    expect(files[1]).not.toBeInstanceOf(ProviderTerraformFile);
  });

  it('should return correct types for mixed files', async () => {
    const fileMap = new Map<string, string>([
      [
        'main.tf',
        `
        module "vpc" {
          source = "./modules/vpc"
        }
      `,
      ],
      [
        'provider.tf',
        `
        terraform {
          required_providers {
            aws = {
              source = "hashicorp/aws"
            }
          }
        }
      `,
      ],
    ]);

    const files = await parseTerraformFiles(fileMap);

    expect(files).toHaveLength(2);
    const mainFile = files.find((f) => f.fileName === 'main.tf');
    const providerFile = files.find((f) => f.fileName === 'provider.tf');
    
    expect(mainFile).toBeInstanceOf(TerraformFile);
    expect(mainFile).not.toBeInstanceOf(ProviderTerraformFile);
    expect(providerFile).toBeInstanceOf(ProviderTerraformFile);
  });
});
