import {
  formatFiles,
  generateFiles,
  getProjects,
  Tree,
  createProjectGraphAsync,
  ProjectGraph,
  readProjectConfiguration,
} from '@nx/devkit';
import * as path from 'path';
import {
  CICDGeneratorNormalizedSchema,
  CICDGeneratorSchema,
} from './schema';
import { PLUGIN_NAME } from '../../constants';

interface TerraformProjectInfo {
  name: string;
  projectType: 'backend' | 'stateful' | 'module';
  backendProject?: string;
  backendType?: 'aws-s3' | 'local';
}

interface ProjectDependencies {
  [projectName: string]: string[];
}

export async function ciCdGenerator(
  tree: Tree,
  options: CICDGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(options);

  // Discover Terraform projects
  let projects = getProjects(tree);
  let terraformProjects: TerraformProjectInfo[] = [];
  const backendProjects: string[] = [];
  const statefulProjects: string[] = [];
  const moduleProjects: string[] = [];
  let hasAwsBackend = false;

  // First, try to get projects from the graph
  for (const [projectName, projectConfig] of projects) {
    const metadata = projectConfig.metadata?.[PLUGIN_NAME];
    if (!metadata?.projectType) {
      continue; // Skip non-terraform projects
    }

    const backendType = metadata.backendType as 'aws-s3' | 'local' | undefined;
    
    const projectInfo: TerraformProjectInfo = {
      name: projectName,
      projectType: metadata.projectType as 'backend' | 'stateful' | 'module',
      backendProject: metadata.backendProject,
      backendType: backendType,
    };

    terraformProjects.push(projectInfo);
  }

  // Fallback: If no terraform projects found, scan for project.json files directly
  if (terraformProjects.length === 0) {
    terraformProjects = discoverTerraformProjectsFromFiles(tree);
    // Rebuild projects map for dependency lookup
    const projectMap = new Map<string, any>();
    for (const projectInfo of terraformProjects) {
      try {
        const config = readProjectConfiguration(tree, projectInfo.name);
        projectMap.set(projectInfo.name, config);
      } catch {
        // Project not found, skip
      }
    }
    projects = projectMap;
  }

  // Process discovered projects
  for (const projectInfo of terraformProjects) {
    // Categorize projects
    if (projectInfo.projectType === 'backend') {
      backendProjects.push(projectInfo.name);
      // Check if this backend uses AWS
      if (projectInfo.backendType === 'aws-s3') {
        hasAwsBackend = true;
      }
    } else if (projectInfo.projectType === 'stateful' || projectInfo.backendProject) {
      statefulProjects.push(projectInfo.name);
      // For stateful projects, check their backend project's type
      if (projectInfo.backendProject) {
        const backendProjectConfig = projects.get(projectInfo.backendProject);
        const backendMetadata = backendProjectConfig?.metadata?.[PLUGIN_NAME];
        if (backendMetadata?.backendType === 'aws-s3') {
          hasAwsBackend = true;
        }
      }
    } else {
      moduleProjects.push(projectInfo.name);
    }
  }

  // If no terraform projects found, skip generation
  if (terraformProjects.length === 0) {
    return;
  }

  // Get project dependencies using project graph
  let projectDependencies: ProjectDependencies = {};
  try {
    const graph = await createProjectGraphAsync();
    projectDependencies = buildProjectDependencies(graph, terraformProjects);
  } catch {
    // Fallback: build dependencies from metadata if graph unavailable
    projectDependencies = buildDependenciesFromMetadata(terraformProjects);
  }

  // Prepare template variables
  const templateVars = {
    ...normalizedOptions,
    terraformProjects: terraformProjects.map((p) => p.name),
    backendProjects,
    statefulProjects,
    moduleProjects,
    projectDependencies,
    hasAwsBackend, // Indicates if any backend uses AWS S3
  };

  // Generate workflow files
  const workflowsDir = path.join(__dirname, 'files', 'workflows');
  generateFiles(tree, workflowsDir, '.github/workflows', templateVars);

  // Generate composite actions
  const actionsDir = path.join(__dirname, 'files', 'actions');
  generateFiles(tree, actionsDir, '.github/actions', templateVars);

  await formatFiles(tree);
}

/**
 * Build project dependencies from project graph
 */
function buildProjectDependencies(
  graph: ProjectGraph,
  terraformProjects: TerraformProjectInfo[]
): ProjectDependencies {
  const dependencies: ProjectDependencies = {};

  for (const project of terraformProjects) {
    const projectDeps = graph.dependencies[project.name] || [];
    dependencies[project.name] = projectDeps
      .filter((dep) => {
        // Only include dependencies to other terraform projects
        return terraformProjects.some((tp) => tp.name === dep.target);
      })
      .map((dep) => dep.target);
  }

  return dependencies;
}

/**
 * Fallback: Build dependencies from metadata
 */
function buildDependenciesFromMetadata(
  terraformProjects: TerraformProjectInfo[]
): ProjectDependencies {
  const dependencies: ProjectDependencies = {};

  for (const project of terraformProjects) {
    dependencies[project.name] = [];
    if (project.backendProject) {
      // Check if backend project exists in terraform projects
      if (terraformProjects.some((tp) => tp.name === project.backendProject)) {
        dependencies[project.name].push(project.backendProject);
      }
    }
  }

  return dependencies;
}

/**
 * Fallback: Discover Terraform projects by scanning for project.json files
 * This is used when getProjects() doesn't find projects (e.g., before nx sync)
 */
function discoverTerraformProjectsFromFiles(
  tree: Tree
): TerraformProjectInfo[] {
  const terraformProjects: TerraformProjectInfo[] = [];
  const projectJsonFiles: string[] = [];

  // Find all project.json files
  tree.children('.').forEach((child) => {
    findProjectJsonFiles(tree, child, projectJsonFiles);
  });

  // Read each project.json and extract Terraform metadata
  for (const projectJsonPath of projectJsonFiles) {
    try {
      const projectJsonContent = tree.read(projectJsonPath, 'utf-8');
      if (!projectJsonContent) {
        continue;
      }

      const projectJson = JSON.parse(projectJsonContent);
      const metadata = projectJson.metadata?.[PLUGIN_NAME];
      
      if (!metadata?.projectType) {
        continue; // Skip non-terraform projects
      }

      // Extract project name from project.json (use 'name' field or infer from path)
      const projectName = projectJson.name || inferProjectNameFromPath(projectJsonPath);
      
      const backendType = metadata.backendType as 'aws-s3' | 'local' | undefined;
      
      terraformProjects.push({
        name: projectName,
        projectType: metadata.projectType as 'backend' | 'stateful' | 'module',
        backendProject: metadata.backendProject,
        backendType: backendType,
      });
    } catch {
      // Skip invalid JSON files
      continue;
    }
  }

  return terraformProjects;
}

/**
 * Recursively find all project.json files in the tree
 */
function findProjectJsonFiles(
  tree: Tree,
  dir: string,
  results: string[]
): void {
  try {
    const children = tree.children(dir);
    for (const child of children) {
      const childPath = path.join(dir, child);
      const projectJsonPath = path.join(childPath, 'project.json');
      
      // Check if this is a project.json file directly
      if (child === 'project.json' && tree.exists(childPath)) {
        results.push(childPath);
      }
      // Check if this directory contains a project.json
      else if (tree.exists(projectJsonPath)) {
        results.push(projectJsonPath);
      }
      // Otherwise, try to recurse into subdirectories
      else {
        try {
          // Try to list children - if it succeeds, it's a directory
          tree.children(childPath);
          findProjectJsonFiles(tree, childPath, results);
        } catch {
          // Not a directory or can't be read, skip
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }
}

/**
 * Infer project name from project.json path
 * e.g., "packages/terraform-setup/project.json" -> "terraform-setup"
 */
function inferProjectNameFromPath(projectJsonPath: string): string {
  const dir = path.dirname(projectJsonPath);
  return path.basename(dir);
}

const normalizeOptions = (
  options: CICDGeneratorSchema
): CICDGeneratorNormalizedSchema => ({
  ...options,
  enableSecurityScan: options.enableSecurityScan ?? true,
  awsRegion: 'us-east-1',
  tmpl: '', // Required to strip __tmpl__ suffix from template filenames
});

export default ciCdGenerator;

