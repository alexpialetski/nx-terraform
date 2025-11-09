import { TerraformFileParser } from '../TerraformFileParser';
import { ProviderTerraformFile } from '../ProviderTerraformFile';
import { ModuleResource } from '../TerraformFile';

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
 * Helper function to parse Terraform files from a map and return ProviderTerraformFile instances
 */
async function parseProviderTerraformFiles(
  fileMap: Map<string, string>
): Promise<ProviderTerraformFile[]> {
  const parser = new TestTerraformFileParser(fileMap);
  const files: ProviderTerraformFile[] = [];
  for await (const file of parser) {
    if (file instanceof ProviderTerraformFile) {
      files.push(file);
    }
  }
  return files;
}

describe('ProviderTerraformFile', () => {
  describe('constructor', () => {
    it('should extract providers in constructor', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `
          provider "aws" {
            region = "us-east-1"
          }
          
          provider "azurerm" {
            features {}
          }
        `,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const file = files[0];
      expect(file.providers).toHaveLength(2);
      expect(file.providers.map((p) => p.name).sort()).toEqual([
        'aws',
        'azurerm',
      ]);
    });

    it('should handle empty providers', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `
          # Empty provider file
        `,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const file = files[0];
      expect(file.providers).toEqual([]);
    });
  });

  describe('extractProviders', () => {
    it('should extract provider blocks', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `
          provider "aws" {
            region = "us-east-1"
          }
          
          provider "azurerm" {
            features {}
          }
        `,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const providers = files[0].extractProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.name).sort()).toEqual(['aws', 'azurerm']);
      expect(providers.every((p) => !('version' in p))).toBe(true);
    });

    it('should handle multiple provider configs', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `
          provider "aws" {
            region = "us-east-1"
          }
          
          provider "aws" {
            region = "us-west-2"
          }
        `,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const providers = files[0].extractProviders();
      expect(providers.length).toBeGreaterThanOrEqual(1);
      expect(providers.some((p) => p.name === 'aws')).toBe(true);
    });

    it('should handle single provider config', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `
          provider "aws" {
            region = "us-east-1"
          }
        `,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);

      expect(files).toHaveLength(1);
      const providers = files[0].extractProviders();
      expect(providers.length).toBeGreaterThanOrEqual(1);
      expect(providers.some((p) => p.name === 'aws')).toBe(true);
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from comment block', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# aws,azurerm
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const metadata = files[0].extractMetadata();

      expect(metadata).not.toBeNull();
      expect(metadata).toBe('aws,azurerm');
    });

    it('should return null if comment does not exist', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const metadata = files[0].extractMetadata();

      expect(metadata).toBeNull();
    });

    it('should handle empty providers string', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# 
# nx-terraform-metadata-end
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const metadata = files[0].extractMetadata();

      expect(metadata).toBe('');
    });

    it('should extract single provider', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# aws
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const metadata = files[0].extractMetadata();

      expect(metadata).toBe('aws');
    });
  });

  describe('updateMetadataComment', () => {
    it('should update comment when providers change', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# aws
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      expect(content).toContain('azurerm');

      // Create new file instance with updated content to verify metadata
      const updatedFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content
      );
      const updatedMetadata = updatedFile.extractMetadata();
      expect(updatedMetadata).toBe('providers: aws,azurerm');
    });

    it('should create comment if it does not exist', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      expect(content).toContain('nx-terraform-metadata-start');
      expect(content).toContain('nx-terraform-metadata-end');
      expect(content).toContain('aws');

      // Verify metadata can be extracted
      const newFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content
      );
      const metadata = newFile.extractMetadata();
      expect(metadata).toBe('providers: aws');
    });

    it('should return unchanged if providers match', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# providers: aws
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(false);
      expect(content).toBe(file.initialFileContent);
    });

    it('should handle empty providers array', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# aws
# nx-terraform-metadata-end
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      const newFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content
      );
      const metadata = newFile.extractMetadata();
      expect(metadata).toBe('');
    });

    it('should preserve file content outside comment', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# Some comment at the top

# nx-terraform-metadata-start
# {
#   "providers": ["aws"],
#   "modules": []
# }
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}

# Some comment at the bottom
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      expect(content).toContain('# Some comment at the top');
      expect(content).toContain('# Some comment at the bottom');
      expect(content).toContain('provider "aws"');
      expect(content).toContain('provider "azurerm"');
    });

    it('should handle multiple providers sorted alphabetically', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# aws
# nx-terraform-metadata-end

provider "azurerm" {
  features {}
}

provider "aws" {
  region = "us-east-1"
}

provider "local" {
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      const newFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content
      );
      const metadata = newFile.extractMetadata();
      // Should be sorted alphabetically
      expect(metadata).toBe('providers: aws,azurerm,local');
    });
  });

  describe('modules', () => {
    it('should have empty modules array by default', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      expect(file.modules).toEqual([]);
    });

    it('should accept modules in constructor', () => {
      const modules: ModuleResource[] = [
        { name: 'vpc', source: './modules/vpc', version: '1.0.0' },
        { name: 'ec2', source: './modules/ec2' },
      ];
      const file = new ProviderTerraformFile(
        'provider.tf',
        'provider.tf',
        {},
        'provider "aws" {}',
        modules
      );

      expect(file.modules).toEqual(modules);
    });

    it('should set modules using setModules method', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const modules: ModuleResource[] = [
        { name: 'vpc', source: './modules/vpc', version: '1.0.0' },
        { name: 'ec2', source: './modules/ec2' },
      ];
      file.setModules(modules);
      expect(file.modules).toEqual(modules);
    });

    it('should include modules in metadata string', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      const modules: ModuleResource[] = [
        { name: 'vpc', source: './modules/vpc', version: '1.0.0' },
        { name: 'ec2', source: './modules/ec2' },
      ];
      file.setModules(modules);

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      const newFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content,
        modules
      );
      const metadata = newFile.extractMetadata();
      // Format: "providers: aws,azurerm, modules: ./modules/ec2,./modules/vpc@1.0.0"
      expect(metadata).toContain('providers: aws,azurerm');
      expect(metadata).toContain('modules:');
      expect(metadata).toContain('./modules/ec2');
      expect(metadata).toContain('./modules/vpc@1.0.0');
    });

    it('should update metadata when modules change', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# providers: aws, modules: ./modules/vpc
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      // Set modules to different values
      const modules: ModuleResource[] = [
        { name: 'ec2', source: './modules/ec2' },
        { name: 'vpc', source: './modules/vpc', version: '1.0.0' },
      ];
      file.setModules(modules);

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      const newFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content,
        modules
      );
      const metadata = newFile.extractMetadata();
      // Format: "providers: aws, modules: ./modules/ec2,./modules/vpc@1.0.0"
      expect(metadata).toContain('providers: aws');
      expect(metadata).toContain('modules:');
      expect(metadata).toContain('./modules/ec2');
      expect(metadata).toContain('./modules/vpc@1.0.0');
    });

    it('should not update metadata when providers and modules match', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# providers: aws, modules: ./modules/ec2,./modules/vpc@1.0.0
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      // Set modules to match metadata
      const modules: ModuleResource[] = [
        { name: 'ec2', source: './modules/ec2' },
        { name: 'vpc', source: './modules/vpc', version: '1.0.0' },
      ];
      file.setModules(modules);

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(false);
      expect(content).toBe(file.initialFileContent);
    });

    it('should handle empty modules array', async () => {
      const fileMap = new Map<string, string>([
        [
          'provider.tf',
          `# nx-terraform-metadata-start
# providers: aws, modules: ./modules/vpc
# nx-terraform-metadata-end

provider "aws" {
  region = "us-east-1"
}
`,
        ],
      ]);

      const files = await parseProviderTerraformFiles(fileMap);
      expect(files).toHaveLength(1);
      const file = files[0];

      // Set modules to empty array
      file.setModules([]);

      const { content, changed } = file.updateMetadataComment();

      expect(changed).toBe(true);
      const newFile = new ProviderTerraformFile(
        file.filePath,
        file.fileName,
        file.getParsedContent(),
        content,
        []
      );
      const metadata = newFile.extractMetadata();
      // Should only have providers (no modules)
      expect(metadata).toBe('providers: aws');
    });
  });
});
