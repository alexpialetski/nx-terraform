import {
  Tree,
  getProjects,
  readProjectConfiguration,
  updateProjectConfiguration,
} from '@nx/devkit';
import { join } from 'path';
import type { SyncGeneratorResult } from 'nx/src/utils/sync-generators';
import { BackendResource, ModuleResource } from '../../utils/TerraformFile';
import { ProviderTerraformFile } from '../../utils/ProviderTerraformFile';
import { TreeTerraformFileParser } from '../../utils/TreeTerraformFileParser';
import { SyncTerraformMetadataGeneratorSchema } from './schema';
import { PLUGIN_NAME } from '../../constants';

/**
 * Project state collected from Terraform files
 */
interface ProjectState {
  backends: BackendResource[];
  modules: ModuleResource[];
  providerFile: ProviderTerraformFile | null;
}

export async function syncTerraformMetadataGenerator(
  tree: Tree,
  _: SyncTerraformMetadataGeneratorSchema
): Promise<SyncGeneratorResult> {
  const projects = getProjects(tree);
  const updatedProjects = new Set<string>();

  for (const [projectName, project] of projects) {
    try {
      const projectRoot = project.root;
      // Read current project configuration first to check if this is a Terraform project
      const projectConfig = readProjectConfiguration(tree, projectName);
      const nxTerraformProjectMetadata = projectConfig.metadata?.[PLUGIN_NAME];

      // Only process projects that have projectType set (indicating they are Terraform projects)
      if (!nxTerraformProjectMetadata) {
        continue;
      }

      // Initialize project state
      const projectState: ProjectState = {
        backends: [],
        modules: [],
        providerFile: null,
      };

      // Use TreeTerraformFileParser to parse all .tf files
      const parser = new TreeTerraformFileParser(tree, projectRoot);

      for await (const terraformFile of parser) {
        // Extract backend blocks (overwrite on each iteration to match original behavior)
        projectState.backends.push(...terraformFile.extractBackends());

        // Collect modules from all files
        projectState.modules.push(...terraformFile.extractModules());

        // Store ProviderTerraformFile reference for provider.tf files
        if (terraformFile instanceof ProviderTerraformFile) {
          projectState.providerFile = terraformFile;
        }
      }

      // Determine hasBackend from collected backends
      const hasBackend = projectState.backends.length > 0;

      const currentBackendProject =
        projectConfig.metadata?.[PLUGIN_NAME]?.backendProject;

      // Determine updates needed based on collected state
      // Only update project type if:
      // 1. Project type is 'module' or 'stateful' (not 'backend')
      // 2. No backendProject is set (backendProject takes precedence)
      if (
        !currentBackendProject &&
        (nxTerraformProjectMetadata.projectType === 'module' ||
          nxTerraformProjectMetadata.projectType === 'stateful')
      ) {
        const expectedTerraformProjectType = hasBackend ? 'stateful' : 'module';
        if (
          nxTerraformProjectMetadata.projectType !==
          expectedTerraformProjectType
        ) {
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
          updatedProjects.add(projectName);
        }
      }

      // Update provider.tf file if it exists
      if (projectState.providerFile) {
        // Set modules on provider file (will be made unique by source inside)
        projectState.providerFile.setModules(projectState.modules);

        const providerTfPath = join(projectRoot, 'provider.tf');
        const { content, changed } =
          projectState.providerFile.updateMetadataComment();

        if (changed) {
          tree.write(providerTfPath, content);
          updatedProjects.add(projectName);
        }
      }
    } catch {
      // Skip projects that can't be processed, continue with next project
      continue;
    }
  }

  // Everything is in sync, return void
  return {
    outOfSyncMessage: `The terraform projects configurations for ${Array.from(
      updatedProjects
    ).join(', ')} need to be updated.`,
  };
}

export default syncTerraformMetadataGenerator;
