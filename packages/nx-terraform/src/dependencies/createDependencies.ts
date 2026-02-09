import {
  CreateDependencies,
  CreateDependenciesContext,
  RawProjectGraphDependency,
} from '@nx/devkit';
import * as path from 'node:path';
import { NxTerraformPluginOptions } from '../types';
import { DependenciesTerraformFileParser } from './DependenciesTerraformFileParser';
import {
  createStaticDependency,
  validateAndAddDependency,
  isLocalPath,
} from './utils';

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
    // (read from terraform-init target's metadata.backendProject)
    // ----------------------------------------------------------------
    const initTarget = projectConfig.targets?.['terraform-init'];
    const initMetadata = initTarget?.metadata as
      | { backendProject?: string }
      | undefined;
    const backendProject = initMetadata?.backendProject;

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

    // Get files to process for this project
    const filesToProcess = ctx.filesToProcess.projectFileMap[projectName] ?? [];

    // Use DependenciesTerraformFileParser to parse all files
    const parser = new DependenciesTerraformFileParser(
      filesToProcess,
      ctx.workspaceRoot
    );

    for await (const terraformFile of parser) {
      // Extract module blocks and process each one
      for (const { source: sourcePath } of terraformFile.extractModules()) {
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

        // Get the relative file path for the source file
        const relativeFilePath = path.relative(
          ctx.workspaceRoot,
          terraformFile.filePath
        );

        validateAndAddDependency(
          createStaticDependency(projectName, targetProject, relativeFilePath),
          ctx,
          results
        );
      }
    }
  }

  return results;
};
