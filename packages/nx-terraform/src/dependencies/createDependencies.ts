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

/** Normalizes a project/module path to a posix path without trailing slash. */
function normalizeRoot(root: string): string {
  return path.posix.normalize(root.replace(/\\/g, '/')).replace(/\/+$/, '');
}

/**
 * Creates dependencies between Terraform projects by:
 * 1. Creating static dependencies from projects to their backend projects (from project.json metadata)
 * 2. Analyzing module references in .tf files (static dependencies)
 */
export const createDependencies: CreateDependencies<
  NxTerraformPluginOptions
> = async (_, ctx: CreateDependenciesContext) => {
  const results: RawProjectGraphDependency[] = [];

  const projectNameByRoot = new Map<string, string>();
  for (const [name, config] of Object.entries(ctx.projects)) {
    projectNameByRoot.set(normalizeRoot(config.root), name);
  }

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

        // Resolve the module source relative to the referencing project root
        // and match it against known project roots (project name may differ
        // from its directory name).
        const resolvedRoot = normalizeRoot(
          path.posix.join(normalizeRoot(projectConfig.root), sourcePath)
        );
        const targetProject = projectNameByRoot.get(resolvedRoot);

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
