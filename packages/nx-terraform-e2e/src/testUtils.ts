import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { expect } from '@jest/globals';
import { ProjectGraph } from '@nx/devkit';

/**
 * Creates a test project with create-nx-terraform-app and installs the plugin
 * @param projectName - Unique name for the test project (to avoid parallel test conflicts)
 * @param extraArgs - Additional arguments to pass to create-nx-terraform-app
 * @returns The directory where the test project was created
 */
export function createTestProject(projectName: string, extraArgs = ''): string {
  const uniqueProjectName = `${projectName}-${Math.random()
    .toString(36)
    .substring(7)}`;
  const projectDirectory = join(process.cwd(), 'tmp', uniqueProjectName);

  // Ensure projectDirectory is empty
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
  mkdirSync(dirname(projectDirectory), {
    recursive: true,
  });

  execSync(
    `npx create-nx-terraform-app@e2e ${uniqueProjectName} ${extraArgs}`,
    {
      cwd: dirname(projectDirectory),
      stdio: 'inherit',
      env: process.env,
    }
  );
  console.log(`Created test project in "${projectDirectory}"`);

  return projectDirectory;
}

/**
 * Executes an Nx command and returns the JSON output
 * @param command - Nx command to execute (e.g., 'show projects', 'show project my-app')
 * @param cwd - Working directory where to execute the command
 * @returns Parsed JSON output
 */
export function execNxCommand(command: string, cwd: string): unknown {
  const output = execSync(`nx ${command} --json`, {
    cwd,
    encoding: 'utf-8',
  });
  return JSON.parse(output);
}

/**
 * Executes a command and returns the output
 * @param command - Command to execute
 * @param cwd - Working directory where to execute the command
 * @param stdio - stdio option (default: 'inherit')
 * @returns Command output as string
 */
export function execCommand(
  command: string,
  cwd: string,
  stdio: 'inherit' | 'pipe' = 'inherit'
): string {
  return execSync(command, {
    cwd,
    stdio,
    encoding: 'utf-8',
  });
}

export const cleanupTestProject = (projectDirectory: string) => {
  rmSync(projectDirectory, {
    recursive: true,
    force: true,
  });
};

/**
 * Resets the Nx build cache (runs 'nx reset' in the given project directory).
 * @param projectDirectory - Directory of the workspace to reset
 */
export function resetNx(projectDirectory: string) {
  execSync('nx reset', {
    cwd: projectDirectory,
    stdio: 'inherit',
  });
}

/**
 * Gets the project graph from Nx and returns it as a parsed JSON object
 * @param projectDirectory - Directory of the workspace
 * @returns Parsed graph JSON object
 */
export function getProjectGraph(projectDirectory: string): ProjectGraph {
  const graphFilePath = join(projectDirectory, 'graph.json');
  execSync(`nx graph --file=${graphFilePath}`, {
    cwd: projectDirectory,
    stdio: 'inherit',
  });
  return JSON.parse(readFileSync(graphFilePath, 'utf-8')).graph;
}

/**
 * Verifies that a static dependency exists in the project graph between two projects,
 * and that the dependency has the expected sourceFile.
 * @param projectDirectory - Directory of the workspace
 * @param sourceProject - Name of the source project
 * @param targetProject - Name of the target project
 */
export function verifyStaticDependency(
  graph: ProjectGraph,
  sourceProject: string,
  targetProject: string
  // TODO: find out how to check source file in the dependency
): void {
  const dependencies = graph.dependencies[sourceProject];

  if (!dependencies || !Array.isArray(dependencies)) {
    throw new Error(`No dependencies found for project "${sourceProject}"`);
  }

  expect(dependencies).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: sourceProject,
        target: targetProject,
        type: 'static',
      }),
    ])
  );
}
