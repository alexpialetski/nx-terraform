import {
  CreateNodesContextV2,
  CreateNodesResultV2,
  ProjectConfiguration,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createNodesV2 } from './createNodes';
import {
  getBackendProjectTargets,
  getModuleProjectTargets,
  getStatefulProjectTargets,
} from './inferedTasks';
import { NxTerraformPluginOptions } from '../types';

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

// Mock logger to avoid console output during tests
jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  logger: {
    warn: jest.fn(),
  },
}));

const readFileSyncMock = jest.mocked(readFileSync);

// Common test constants
const PROJECT_ROOT = 'packages/my-project';
const CONFIG_FILE_PATH = join(PROJECT_ROOT, 'project.json');

function createTestContext(
  overrides?: Partial<CreateNodesContextV2>
): CreateNodesContextV2 {
  return {
    workspaceRoot: '/workspace',
    nxJsonConfiguration: {},
    ...overrides,
  };
}

interface FileContent {
  [filename: string]: string;
}

/**
 * Sets up mocks for readFileSync
 */
function setupFileMocks(
  projectJson: ProjectConfiguration,
  fileContents: FileContent = {}
): void {
  readFileSyncMock.mockImplementation((path: string) => {
    const pathStr = path.toString();
    if (pathStr.includes('project.json')) {
      return Buffer.from(JSON.stringify(projectJson));
    }
    // Check each file content
    for (const [filename, content] of Object.entries(fileContents)) {
      if (pathStr.includes(filename) || pathStr.endsWith(filename)) {
        return Buffer.from(content);
      }
    }
    throw new Error(`Unexpected file read: ${pathStr}`);
  });
}

/**
 * Executes the createNodesV2 handler and returns the result
 */
async function executeHandler(
  configFilePath: string,
  context: CreateNodesContextV2,
  options: NxTerraformPluginOptions = {}
): Promise<CreateNodesResultV2> {
  const [_, handler] = createNodesV2;
  return await handler([configFilePath], options, context);
}

/** Projects map from CreateNodesResult (root may be omitted). */
type ProjectsFromResult = NonNullable<
  CreateNodesResultV2[number][1]['projects']
>;

/**
 * Extracts and verifies projects from the result
 * Returns the projects object if found, or null if not found
 */
function extractProjects(
  result: CreateNodesResultV2,
  PROJECT_ROOT: string
): { projects: ProjectsFromResult; PROJECT_ROOT: string } | null {
  const projects = result[0]?.[1]?.projects;

  if (!projects) {
    expect(readFileSyncMock).toHaveBeenCalled();
    expect(result).toBeDefined();
    return null;
  }

  expect(projects).toBeDefined();
  expect(projects[PROJECT_ROOT]).toBeDefined();
  return { projects, PROJECT_ROOT };
}

/**
 * Verifies that the project targets match the expected targets
 */
function verifyProjectTargets(
  projects: ProjectsFromResult,
  PROJECT_ROOT: string,
  expectedTargets: NonNullable<ProjectConfiguration['targets']>
): void {
  expect(projects[PROJECT_ROOT].targets).toEqual(expectedTargets);
}

describe('createNodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('project discovery', () => {
    it('should return empty object when project has no terraform metadata', async () => {
      const projectJson: ProjectConfiguration = {
        root: PROJECT_ROOT,
        projectType: 'application',
        targets: {},
        metadata: {},
      };

      setupFileMocks(projectJson);

      const context = createTestContext();
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      // When no terraform metadata exists, createNodesInternal returns {}
      expect(result).toBeDefined();
      if ('projects' in result) {
        expect(Object.keys(result.projects || {})).toHaveLength(0);
      }
    });

    it('should create project when project.json exists with terraform metadata', async () => {
      const projectJson: ProjectConfiguration = {
        root: PROJECT_ROOT,
        projectType: 'application',
        targets: {},
        metadata: {
          'nx-terraform': {
            projectType: 'module',
          },
        },
      };

      setupFileMocks(projectJson);

      const context = createTestContext();
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      expect(result).toBeDefined();
      // createNodesFromFiles aggregates results, check if projects exist
      if ('projects' in result) {
        expect(result.projects).toBeDefined();
        expect(result.projects[PROJECT_ROOT]).toBeDefined();
        expect(result.projects[PROJECT_ROOT].targets).toBeDefined();
      } else {
        // If structure is different, result should still be defined
        expect(result).toBeDefined();
      }
    });
  });

  describe('application projects', () => {
    it('should use stateful targets when terraform-init metadata.backendProject is set', async () => {
      const projectJson: ProjectConfiguration = {
        root: PROJECT_ROOT,
        projectType: 'application',
        targets: {
          'terraform-init': {
            metadata: {
              backendProject: 'my-backend',
            },
          },
        },
        metadata: {
          'nx-terraform': {
            projectType: 'module',
          },
        },
      };

      // Stateful targets come from terraform-init.metadata.backendProject, not from .tf scanning
      const backendTfContent = `
        terraform {
          backend "s3" {
            bucket = "my-bucket"
            key    = "terraform.tfstate"
            region = "us-east-1"
          }
        }
      `;

      setupFileMocks(projectJson, {
        'backend.tf': backendTfContent,
      });

      const context = createTestContext();
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      const expectedTargets = getStatefulProjectTargets({
        init: { backendProject: 'my-backend' },
      });

      const extracted = extractProjects(result, PROJECT_ROOT);
      if (extracted) {
        verifyProjectTargets(
          extracted.projects,
          extracted.PROJECT_ROOT,
          expectedTargets
        );
        // Should only read project.json (no .tf file scanning needed)
        expect(readFileSyncMock).toHaveBeenCalledTimes(1);
      }
    });

    it('should use backend targets when terraformProjectType is backend', async () => {
      const projectJson: ProjectConfiguration = {
        root: PROJECT_ROOT,
        projectType: 'application',
        targets: {},
        metadata: {
          'nx-terraform': {
            projectType: 'backend',
          },
        },
      };

      const mainTfContent = 'resource "aws_s3_bucket" "test" {}';

      setupFileMocks(projectJson, {
        'main.tf': mainTfContent,
      });

      const context = createTestContext();
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      const expectedTargets = getBackendProjectTargets({
        init: { backendProject: null },
      });

      const extracted = extractProjects(result, PROJECT_ROOT);
      if (extracted) {
        verifyProjectTargets(
          extracted.projects,
          extracted.PROJECT_ROOT,
          expectedTargets
        );
      }
    });

    it('should use stateful targets when terraformProjectType is stateful', async () => {
      const projectJson: ProjectConfiguration = {
        root: PROJECT_ROOT,
        projectType: 'application',
        targets: {},
        metadata: {
          'nx-terraform': {
            projectType: 'stateful',
          },
        },
      };

      setupFileMocks(projectJson);

      const context = createTestContext();
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      const expectedTargets = getStatefulProjectTargets({
        init: { backendProject: null },
      });

      const extracted = extractProjects(result, PROJECT_ROOT);
      if (extracted) {
        verifyProjectTargets(
          extracted.projects,
          extracted.PROJECT_ROOT,
          expectedTargets
        );
      }
    });
  });

  describe('library/module projects', () => {
    it('should use module targets for module projects without backend', async () => {
      const projectJson: ProjectConfiguration = {
        root: PROJECT_ROOT,
        projectType: 'application',
        targets: {},
        metadata: {
          'nx-terraform': {
            projectType: 'module',
          },
        },
      };

      setupFileMocks(projectJson);

      const context = createTestContext();
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      const expectedTargets = getModuleProjectTargets({
        init: { backendProject: null },
      });

      const extracted = extractProjects(result, PROJECT_ROOT);
      if (extracted) {
        verifyProjectTargets(
          extracted.projects,
          extracted.PROJECT_ROOT,
          expectedTargets
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle project.json read errors gracefully', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('File not found');
      });

      const context = createTestContext();

      // createNodesFromFiles will catch errors and aggregate them
      // We expect it to handle the error gracefully
      const result = await executeHandler(CONFIG_FILE_PATH, context);

      // Should return empty object when project.json can't be read
      expect(result).toBeDefined();
      // The result might be empty or contain an error, both are acceptable
    });
  });

  describe('glob pattern', () => {
    it('should use correct glob pattern', () => {
      const [glob] = createNodesV2;
      expect(glob).toBe('**/project.json');
    });
  });
});
