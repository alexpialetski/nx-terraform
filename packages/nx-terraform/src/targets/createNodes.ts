import {
  CreateNodesContextV2,
  CreateNodesV2,
  ProjectConfiguration,
  createNodesFromFiles,
} from '@nx/devkit';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  getBackendProjectTargets,
  getModuleProjectTargets,
  getStatefulProjectTargets,
  type TargetsConfigurationParams,
} from './inferedTasks';
import type { TerraformInitTargetMetadata } from './type';
import { NxTerraformPluginOptions } from '../types';
import { PLUGIN_NAME } from '../constants';

// File glob to find all the configuration files for this plugin
const terraformConfigGlob = '**/project.json';

// Entry function that Nx calls to modify the graph
export const createNodesV2: CreateNodesV2<NxTerraformPluginOptions> = [
  terraformConfigGlob,
  async (configFiles, options, context) => {
    return await createNodesFromFiles(
      (configFile, options, context) =>
        createNodesInternal(configFile, options, context),
      configFiles,
      options,
      context
    );
  },
];

async function createNodesInternal(
  configFilePath: string,
  _options: NxTerraformPluginOptions,
  context: CreateNodesContextV2
) {
  const projectRoot = dirname(configFilePath);

  // Read project.json content
  let projectJsonContent: ProjectConfiguration;
  try {
    projectJsonContent = JSON.parse(
      readFileSync(join(context.workspaceRoot, configFilePath)).toString()
    );
  } catch {
    // If project.json can't be read, skip this project
    return {};
  }

  // Check if this is a Terraform project by checking metadata
  const terraformProjectType =
    projectJsonContent.metadata?.[PLUGIN_NAME]?.projectType;

  if (!terraformProjectType) {
    // Not a Terraform project (no projectType metadata), skip
    return {};
  }

  const targetConfigurationParams = normalizeTargetOptions(projectJsonContent);

  let projectTargets: ProjectConfiguration['targets'] = {};

  // Determine targets based on metadata (no fallback scanning needed)
  if (terraformProjectType === 'backend') {
    projectTargets = getBackendProjectTargets(targetConfigurationParams);
  } else if (targetConfigurationParams.init.backendProject) {
    // If backendProject option is set, it's a stateful module
    projectTargets = getStatefulProjectTargets(targetConfigurationParams);
  } else if (terraformProjectType === 'stateful') {
    // If terraformProjectType is explicitly 'stateful', use stateful targets
    projectTargets = getStatefulProjectTargets(targetConfigurationParams);
  } else {
    // Default: Return module project targets (for 'module' type or missing type)
    projectTargets = getModuleProjectTargets(targetConfigurationParams);
  }

  // Project configuration to be merged into the rest of the Nx configuration
  return {
    projects: {
      [projectRoot]: {
        targets: projectTargets,
      },
    },
  };
}

/**
 * Normalizes project.json into params for building Terraform targets.
 * backendProject is read from terraform-init target's metadata; varFile is via target args/configurations.
 */
function normalizeTargetOptions(
  projectJsonContent: ProjectConfiguration
): TargetsConfigurationParams {
  const initTarget = projectJsonContent.targets?.['terraform-init'];
  const metadata = initTarget?.metadata as TerraformInitTargetMetadata | undefined;
  const backendProject = metadata?.backendProject ?? null;

  return {
    init: {
      backendProject,
    },
  };
}
