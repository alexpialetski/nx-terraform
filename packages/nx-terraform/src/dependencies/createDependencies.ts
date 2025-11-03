import {
  CreateDependencies,
  CreateDependenciesContext,
  RawProjectGraphDependency,
} from '@nx/devkit';
import * as path from 'node:path';
import { NxTerraformPluginOptions } from '../types';
import {
  extractModuleBlocks,
  getTerraformFilesToProcess,
  parseTerraformFile,
  readTerraformFile,
  isLocalPath,
} from './fileParser';
import { createStaticDependency, validateAndAddDependency } from './utils';

/**
 * Creates dependencies between Terraform projects by:
 * 1. Creating static dependencies from projects to their backend projects (from project.json metadata)
 * 2. Analyzing module references in .tf files (static dependencies)
 */
export const createDependencies: CreateDependencies<
  NxTerraformPluginOptions
> = async (_, ctx: CreateDependenciesContext) => {
  const results: RawProjectGraphDependency[] = [];

  for (const [projectName, projectConfig] of Object.entries(ctx.projects)) {
    // ----------------------------------------------------------------
    // Static dependencies from projects to their backend projects
    // ----------------------------------------------------------------
    const backendProject = projectConfig.metadata?.backendProject;

    if (backendProject) {
      // Verify backend project exists
      if (ctx.projects[backendProject]) {
        validateAndAddDependency(
          createStaticDependency(
            projectName,
            backendProject,
            path.join(projectConfig.root, 'project.json')
          ),
          ctx,
          results
        );
      }
    }

    // ----------------------------------------------------------------
    // Static dependencies from projects to their module projects
    // ----------------------------------------------------------------

    // Find .tf files to process in this project (only changed files)
    const tfFilesToProcess = getTerraformFilesToProcess(
      ctx.filesToProcess.projectFileMap[projectName] ?? []
    );

    for (const file of tfFilesToProcess) {
      const filePath = path.join(ctx.workspaceRoot, file.file);

      // Read and parse the Terraform file
      const { content: fileContent, success: readSuccess } = readTerraformFile(
        filePath,
        file.file
      );
      if (!readSuccess) {
        continue;
      }

      const { parsed, success: parseSuccess } = await parseTerraformFile(
        file.file,
        fileContent
      );
      if (!parseSuccess) {
        continue;
      }

      // Extract module blocks and process each one
      for (const { source: sourcePath } of extractModuleBlocks(parsed)) {
        // Only process local paths (./ or ../)
        if (!isLocalPath(sourcePath)) {
          continue;
        }

        // Extract the last segment of the path as the potential project name
        const potentialProjectName = sourcePath.split('/').pop();

        // Check if the last segment matches a project name
        const targetProject = ctx.projects[potentialProjectName]
          ? potentialProjectName
          : undefined;

        // Skip if no target project found or if it's a self-reference
        if (!targetProject || targetProject === projectName) {
          continue;
        }

        validateAndAddDependency(
          createStaticDependency(projectName, targetProject, file.file),
          ctx,
          results
        );
      }
    }
  }

  return results;
};
