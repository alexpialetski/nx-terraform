import {
  Tree,
  getProjects,
  readProjectConfiguration,
  updateProjectConfiguration,
} from '@nx/devkit';
import { join } from 'path';
import type { SyncGeneratorResult } from 'nx/src/utils/sync-generators';
import { hasBackendBlock, parseTerraformFile } from '../../utils/fileParser';
import { SyncTerraformMetadataGeneratorSchema } from './schema';
import { PLUGIN_NAME } from '../../constants';

export async function syncTerraformMetadataGenerator(
  tree: Tree,
  _: SyncTerraformMetadataGeneratorSchema
): Promise<SyncGeneratorResult> {
  const projects = getProjects(tree);
  const updatedProjects: string[] = [];

  for (const [projectName, project] of projects) {
    try {
      const projectRoot = project.root;
      // Read current project configuration first to check if this is a Terraform project
      const projectConfig = readProjectConfiguration(tree, projectName);
      const currentTerraformProjectType =
        projectConfig.metadata?.[PLUGIN_NAME]?.projectType;

      // Only process projects that have projectType set (indicating they are Terraform projects)
      // This ensures we only manage projects that are explicitly Terraform projects
      if (!currentTerraformProjectType) {
        continue;
      }

      // Only process 'module' or 'stateful' types (these can be synced based on .tf files)
      if (
        currentTerraformProjectType !== 'module' &&
        currentTerraformProjectType !== 'stateful'
      ) {
        continue;
      }

      const tfFiles = tree
        .children(projectRoot)
        .filter((file) => file.endsWith('.tf'));

      // Check if project has .tf files
      if (tfFiles.length === 0) {
        // No .tf files, skip
        continue;
      }

      const currentBackendProject =
        projectConfig.metadata?.[PLUGIN_NAME]?.backendProject;

      // If backendProject is set, the type should be 'module' (stateful module)
      // Don't change it - backendProject takes precedence
      if (currentBackendProject) {
        continue;
      }

      // Scan .tf files for backend blocks to determine if type should be updated
      let hasBackend = false;
      for (const tfFile of tfFiles) {
        const filePath = join(projectRoot, tfFile);

        // Read file content from Tree
        const fileContent = tree.read(filePath, 'utf-8');
        if (!fileContent) {
          continue;
        }

        const { parsed, success: parseSuccess } = await parseTerraformFile(
          tfFile,
          fileContent
        );
        if (!parseSuccess) {
          continue;
        }

        if (hasBackendBlock(parsed)) {
          hasBackend = true;
          break;
        }
      }

      // Determine the correct type based on backend blocks
      const expectedTerraformProjectType = hasBackend ? 'stateful' : 'module';

      // Only update if the current type doesn't match what we detected
      if (currentTerraformProjectType !== expectedTerraformProjectType) {
        updateProjectConfiguration(tree, projectName, {
          ...projectConfig,
          metadata: {
            ...projectConfig.metadata,
            [PLUGIN_NAME]: {
              ...projectConfig.metadata?.[PLUGIN_NAME],
              projectType: expectedTerraformProjectType,
            },
          },
        });
        updatedProjects.push(projectName);
      }
    } catch {
      // Skip projects that can't be processed, continue with next project
      continue;
    }
  }

  // Everything is in sync, return void
  return {
    outOfSyncMessage: `The terraform projects configurations for ${updatedProjects.join(
      ', '
    )} need to be updated.`,
  };
}

export default syncTerraformMetadataGenerator;
