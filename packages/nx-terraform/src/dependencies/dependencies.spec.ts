import { CreateDependenciesContext, DependencyType } from '@nx/devkit';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as hcl2json from '@cdktf/hcl2json';
import { createDependencies } from './createDependencies';

// Mock fs.readFileSync
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

// Mock hcl2json.parse
jest.mock('@cdktf/hcl2json', () => ({
  parse: jest.fn(),
}));

// Mock validateDependency to always pass
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  validateDependency: jest.fn(), // Mock to do nothing (validates successfully)
}));

const readFileSyncMock = jest.mocked(readFileSync);
const hcl2jsonParseMock = jest.mocked(hcl2json.parse);

function createTestContext(
  projects: CreateDependenciesContext['projects'],
  projectFileMap: CreateDependenciesContext['filesToProcess']['projectFileMap'],
  overrides?: Partial<CreateDependenciesContext>
): CreateDependenciesContext {
  const workspaceRoot = '/workspace';

  return {
    projects,
    nxJsonConfiguration: {},
    filesToProcess: {
      projectFileMap,
      nonProjectFiles: [],
    },
    fileMap: {
      projectFileMap: {},
      nonProjectFiles: [],
    },
    workspaceRoot,
    externalNodes: {},
    ...overrides,
  };
}

describe('createDependencies', () => {
  const workspaceRoot = '/workspace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect module dependency from local path', async () => {
    const appProjectRoot = 'packages/app';
    const moduleProjectRoot = 'packages/networking';
    const mainTfPath = join(appProjectRoot, 'main.tf');
    const mainTfContent = `
module "networking" {
  source = "../networking"
  
  vpc_cidr = "10.0.0.0/16"
}
`;

    readFileSyncMock.mockReturnValue(mainTfContent);
    hcl2jsonParseMock.mockResolvedValue({
      module: {
        networking: [
          {
            source: '../networking',
          },
        ],
      },
    });

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
        networking: {
          root: moduleProjectRoot,
          projectType: 'library',
          targets: {},
        },
      },
      {
        app: [
          {
            file: mainTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      source: 'app',
      target: 'networking',
      sourceFile: mainTfPath,
      type: DependencyType.static,
    });
    expect(readFileSync).toHaveBeenCalledWith(
      join(workspaceRoot, mainTfPath),
      'utf-8'
    );
    expect(hcl2json.parse).toHaveBeenCalledWith(mainTfPath, mainTfContent);
  });

  it('should skip remote module sources', async () => {
    const appProjectRoot = 'packages/app';
    const mainTfPath = join(appProjectRoot, 'main.tf');
    const mainTfContent = `
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "3.0.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
}
`;

    readFileSyncMock.mockReturnValue(mainTfContent);
    hcl2jsonParseMock.mockResolvedValue({
      module: {
        vpc: [
          {
            source: 'terraform-aws-modules/vpc/aws',
          },
        ],
      },
    });

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
      },
      {
        app: [
          {
            file: mainTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(0);
  });

  it('should skip self-references', async () => {
    const appProjectRoot = 'packages/app';
    const mainTfPath = join(appProjectRoot, 'main.tf');
    const mainTfContent = `
module "local" {
  source = "."
  
  name = "test"
}
`;

    readFileSyncMock.mockReturnValue(mainTfContent);
    hcl2jsonParseMock.mockResolvedValue({
      module: {
        local: [
          {
            source: '.',
          },
        ],
      },
    });

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
      },
      {
        app: [
          {
            file: mainTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(0);
  });

  it('should handle multiple module references in one file', async () => {
    const appProjectRoot = 'packages/app';
    const module1Root = 'packages/networking';
    const module2Root = 'packages/security';
    const mainTfPath = join(appProjectRoot, 'main.tf');
    const mainTfContent = `
module "networking" {
  source = "../networking"
  
  vpc_cidr = "10.0.0.0/16"
}

module "security" {
  source = "../security"
  
  enabled = true
}
`;

    readFileSyncMock.mockReturnValue(mainTfContent);
    hcl2jsonParseMock.mockResolvedValue({
      module: {
        networking: [
          {
            source: '../networking',
          },
        ],
        security: [
          {
            source: '../security',
          },
        ],
      },
    });

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
        networking: {
          root: module1Root,
          projectType: 'library',
          targets: {},
        },
        security: {
          root: module2Root,
          projectType: 'library',
          targets: {},
        },
      },
      {
        app: [
          {
            file: mainTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'app',
          target: 'networking',
          type: DependencyType.static,
        }),
        expect.objectContaining({
          source: 'app',
          target: 'security',
          type: DependencyType.static,
        }),
      ])
    );
  });

  it('should process multiple .tf files', async () => {
    const appProjectRoot = 'packages/app';
    const module1Root = 'packages/networking';
    const module2Root = 'packages/compute';
    const mainTfPath = join(appProjectRoot, 'main.tf');
    const computeTfPath = join(appProjectRoot, 'compute.tf');
    const mainTfContent = 'module "networking" { source = "../networking" }';
    const computeTfContent = 'module "compute" { source = "../compute" }';

    readFileSyncMock
      .mockReturnValueOnce(mainTfContent)
      .mockReturnValueOnce(computeTfContent);
    hcl2jsonParseMock
      .mockResolvedValueOnce({
        module: {
          networking: [{ source: '../networking' }],
        },
      })
      .mockResolvedValueOnce({
        module: {
          compute: [{ source: '../compute' }],
        },
      });

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
        networking: {
          root: module1Root,
          projectType: 'library',
          targets: {},
        },
        compute: {
          root: module2Root,
          projectType: 'library',
          targets: {},
        },
      },
      {
        app: [
          { file: mainTfPath, hash: 'hash123' },
          { file: computeTfPath, hash: 'hash456' },
        ],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'app',
          target: 'networking',
          type: DependencyType.static,
        }),
        expect.objectContaining({
          source: 'app',
          target: 'compute',
          type: DependencyType.static,
        }),
      ])
    );
  });

  it('should handle unparseable files gracefully', async () => {
    const appProjectRoot = 'packages/app';
    const invalidTfPath = join(appProjectRoot, 'invalid.tf');
    const invalidContent = 'invalid hcl syntax {{{{';

    readFileSyncMock.mockReturnValue(invalidContent);
    hcl2jsonParseMock.mockRejectedValue(new Error('Parse error'));

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
      },
      {
        app: [
          {
            file: invalidTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    // Should not throw, but return empty results
    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(0);
  });

  it('should handle file read errors gracefully', async () => {
    const appProjectRoot = 'packages/app';
    const mainTfPath = join(appProjectRoot, 'main.tf');

    readFileSyncMock.mockImplementation(() => {
      throw new Error('File not found');
    });

    const ctx = createTestContext(
      {
        app: {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
        },
      },
      {
        app: [
          {
            file: mainTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    // Should not throw, but return empty results
    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(0);
  });

  it('should create static dependency from project to backend project', async () => {
    const backendProjectRoot = 'packages/terraform-setup';
    const appProjectRoot = 'packages/terraform-infra';

    const ctx = createTestContext(
      {
        'terraform-setup': {
          root: backendProjectRoot,
          projectType: 'application',
          targets: {},
          metadata: {},
        },
        'terraform-infra': {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
          metadata: {
            backendProject: 'terraform-setup',
          },
        },
      },
      {
        'terraform-infra': [],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      source: 'terraform-infra',
      target: 'terraform-setup',
      sourceFile: `${appProjectRoot}/project.json`,
      type: DependencyType.static,
    });
  });

  it('should create both backend and module static dependencies', async () => {
    const backendProjectRoot = 'packages/terraform-setup';
    const appProjectRoot = 'packages/terraform-infra';
    const moduleProjectRoot = 'packages/shared-module';
    const mainTfPath = join(appProjectRoot, 'main.tf');
    const mainTfContent = 'module "shared" { source = "../shared-module" }';

    readFileSyncMock.mockReturnValue(mainTfContent);
    hcl2jsonParseMock.mockResolvedValue({
      module: {
        shared: [{ source: '../shared-module' }],
      },
    });

    const ctx = createTestContext(
      {
        'terraform-setup': {
          root: backendProjectRoot,
          projectType: 'application',
          targets: {},
          metadata: {},
        },
        'terraform-infra': {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
          metadata: {
            backendProject: 'terraform-setup',
          },
        },
        'shared-module': {
          root: moduleProjectRoot,
          projectType: 'library',
          targets: {},
        },
      },
      {
        'terraform-infra': [
          {
            file: mainTfPath,
            hash: 'hash123',
          },
        ],
      }
    );

    const results = await createDependencies({}, ctx);

    expect(results).toHaveLength(2);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'terraform-infra',
          target: 'terraform-setup',
          sourceFile: `${appProjectRoot}/project.json`,
          type: DependencyType.static,
        }),
        expect.objectContaining({
          source: 'terraform-infra',
          target: 'shared-module',
          sourceFile: mainTfPath,
          type: DependencyType.static,
        }),
      ])
    );
  });

  it('should skip invalid backend project references', async () => {
    const appProjectRoot = 'packages/terraform-infra';

    const ctx = createTestContext(
      {
        'terraform-infra': {
          root: appProjectRoot,
          projectType: 'application',
          targets: {},
          metadata: {
            backendProject: 'non-existent-backend',
          },
        },
      },
      {
        'terraform-infra': [],
      }
    );

    const results = await createDependencies({}, ctx);

    // Should not create dependency if backend project doesn't exist
    expect(results).toHaveLength(0);
  });
});
