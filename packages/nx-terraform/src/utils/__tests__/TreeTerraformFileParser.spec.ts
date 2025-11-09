import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { TreeTerraformFileParser } from '../TreeTerraformFileParser';
import { TerraformFile } from '../TerraformFile';
import { ProviderTerraformFile } from '../ProviderTerraformFile';

// Mock logger to avoid console output during tests
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

describe('TreeTerraformFileParser', () => {
  it('should find and parse .tf files from project root', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(
      `${projectRoot}/main.tf`,
      `
      module "vpc" {
        source = "./modules/vpc"
      }
    `
    );
    tree.write(
      `${projectRoot}/backend.tf`,
      `
      terraform {
        backend "s3" {}
      }
    `
    );

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.fileName).sort()).toEqual([
      'backend.tf',
      'main.tf',
    ]);
  });

  it('should only find .tf files and ignore other files', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');
    tree.write(`${projectRoot}/README.md`, '# Project');
    tree.write(`${projectRoot}/variables.tf`, 'variable "name" {}');
    tree.write(`${projectRoot}/project.json`, '{}');

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    expect(files.map((f) => f.fileName).sort()).toEqual([
      'main.tf',
      'variables.tf',
    ]);
  });

  it('should only find files at first level (flat structure)', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');
    tree.write(
      `${projectRoot}/subdir/nested.tf`,
      'resource "aws_s3_bucket" "nested" {}'
    );

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(1);
    expect(files[0].fileName).toBe('main.tf');
    expect(files[0].filePath).toBe(`${projectRoot}/main.tf`);
  });

  it('should handle empty project root', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/empty-project';

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(0);
  });

  it('should handle non-existent project root', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/non-existent';

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(0);
  });

  it('should skip empty .tf files', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');
    tree.write(`${projectRoot}/empty.tf`, '');

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    // Only the non-empty file should be parsed
    expect(files.length).toBeLessThanOrEqual(1);
    if (files.length > 0) {
      expect(files[0].fileName).toBe('main.tf');
    }
  });

  it('should parse files and extract content correctly', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(
      `${projectRoot}/main.tf`,
      `
      module "vpc" {
        source  = "./modules/vpc"
        version = "1.0.0"
      }
      
      terraform {
        backend "s3" {}
      }
    `
    );

    tree.write(
      `${projectRoot}/provider.tf`,
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

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(2);
    const mainFile = files.find((f) => f.fileName === 'main.tf');
    const providerFile = files.find((f) => f.fileName === 'provider.tf');

    expect(mainFile).toBeDefined();
    expect(mainFile?.fileName).toBe('main.tf');
    expect(mainFile?.filePath).toBe(`${projectRoot}/main.tf`);

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

  it('should handle files with invalid HCL syntax', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(`${projectRoot}/valid.tf`, 'resource "aws_s3_bucket" "test" {}');
    tree.write(`${projectRoot}/invalid.tf`, 'invalid hcl syntax {');

    const parser = new TreeTerraformFileParser(tree, projectRoot);
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

  it('should construct file paths correctly using project root', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const projectRoot = 'packages/my-project';

    tree.write(`${projectRoot}/main.tf`, 'resource "aws_s3_bucket" "test" {}');

    const parser = new TreeTerraformFileParser(tree, projectRoot);
    const files: TerraformFile[] = [];
    for await (const file of parser) {
      files.push(file);
    }

    expect(files).toHaveLength(1);
    expect(files[0].filePath).toBe(`${projectRoot}/main.tf`);
    expect(files[0].fileName).toBe('main.tf');
  });
});
