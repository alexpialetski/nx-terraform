import { readFile } from 'fs/promises';
import { DependenciesTerraformFileParser } from '../DependenciesTerraformFileParser';
import { TerraformFile } from '../../utils/TerraformFile';
import { ProviderTerraformFile } from '../../utils/ProviderTerraformFile';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock logger to avoid console output during tests
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

const readFileMock = jest.mocked(readFile);

describe('DependenciesTerraformFileParser', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter only .tf files from filesToProcess', async () => {
    const filesToProcess = [
      { file: 'packages/app/main.tf' },
      { file: 'packages/app/variables.tf' },
      { file: 'packages/app/README.md' },
      { file: 'packages/app/project.json' },
    ];

    readFileMock.mockResolvedValue('resource "aws_s3_bucket" "test" {}');

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.fileName).sort()).toEqual([
      'main.tf',
      'variables.tf',
    ]);
    expect(readFileMock).toHaveBeenCalledTimes(2);
    expect(readFileMock).toHaveBeenCalledWith(
      '/workspace/packages/app/main.tf',
      'utf-8'
    );
    expect(readFileMock).toHaveBeenCalledWith(
      '/workspace/packages/app/variables.tf',
      'utf-8'
    );
  });

  it('should construct full file paths using workspace root', async () => {
    const filesToProcess = [{ file: 'packages/app/main.tf' }];

    readFileMock.mockResolvedValue(
      `
      module "vpc" {
        source = "./modules/vpc"
      }
    `
    );

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(1);
    expect(files[0].filePath).toBe('/workspace/packages/app/main.tf');
    expect(files[0].fileName).toBe('main.tf');
    expect(readFileMock).toHaveBeenCalledWith(
      '/workspace/packages/app/main.tf',
      'utf-8'
    );
  });

  it('should handle readFile errors gracefully', async () => {
    const filesToProcess = [
      { file: 'packages/app/main.tf' },
      { file: 'packages/app/missing.tf' },
    ];

    readFileMock
      .mockResolvedValueOnce('resource "aws_s3_bucket" "test" {}')
      .mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('main.tf');
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });

  it('should handle empty filesToProcess array', async () => {
    const filesToProcess: Array<{ file: string }> = [];

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(0);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('should handle filesToProcess with no .tf files', async () => {
    const filesToProcess = [
      { file: 'packages/app/README.md' },
      { file: 'packages/app/project.json' },
    ];

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(0);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('should parse files and extract content correctly', async () => {
    const filesToProcess = [
      { file: 'packages/app/main.tf' },
      { file: 'packages/app/provider.tf' },
    ];

    readFileMock
      .mockResolvedValueOnce(
        `
      module "vpc" {
        source  = "./modules/vpc"
        version = "1.0.0"
      }
      
      terraform {
        backend "s3" {}
      }
    `
      )
      .mockResolvedValueOnce(
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
    `
      );

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    const mainFile = files.find((f) => f.fileName === 'main.tf');
    const providerFile = files.find((f) => f.fileName === 'provider.tf');

    expect(mainFile).toBeDefined();
    const modules = mainFile!.extractModules();
    expect(modules).toHaveLength(1);
    expect(modules[0]).toEqual({
      name: 'vpc',
      source: './modules/vpc',
      version: '1.0.0',
    });

    const backends = mainFile!.extractBackends();
    expect(backends.length).toBeGreaterThanOrEqual(1);
    expect(backends.some((b) => b.name === 's3')).toBe(true);

    expect(providerFile).toBeDefined();
    expect(providerFile).toBeInstanceOf(ProviderTerraformFile);
    const providerTfFile = providerFile as ProviderTerraformFile;
    expect(providerTfFile.providers).toHaveLength(1);
    expect(providerTfFile.providers[0].name).toBe('aws');
  });

  it('should handle multiple files with mixed success and failures', async () => {
    const filesToProcess = [
      { file: 'packages/app/main.tf' },
      { file: 'packages/app/variables.tf' },
      { file: 'packages/app/missing.tf' },
    ];

    readFileMock
      .mockResolvedValueOnce('module "vpc" { source = "./modules/vpc" }')
      .mockResolvedValueOnce('variable "name" { type = string }')
      .mockRejectedValueOnce(new Error('File not found'));

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.fileName).sort()).toEqual([
      'main.tf',
      'variables.tf',
    ]);
    expect(readFileMock).toHaveBeenCalledTimes(3);
  });

  it('should handle files with invalid HCL syntax', async () => {
    const filesToProcess = [
      { file: 'packages/app/valid.tf' },
      { file: 'packages/app/invalid.tf' },
    ];

    readFileMock
      .mockResolvedValueOnce('resource "aws_s3_bucket" "test" {}')
      .mockResolvedValueOnce('invalid hcl syntax {');

    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      workspaceRoot
    );
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    // Only the valid file should be parsed
    expect(files.length).toBeLessThanOrEqual(1);
    if (files.length > 0) {
      expect(files[0].fileName).toBe('valid.tf');
    }
  });
});
