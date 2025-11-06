import {
  CreateNodesContextV2,
  CreateNodesV2,
  ProjectConfiguration,
  createNodesFromFiles,
} from '@nx/devkit';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  getBackendProjectTargets,
  getModuleProjectTargets,
  getStatefulProjectTargets,
  type TargetsConfigurationParams,
} from './inferedTasks';
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

  // Read directory to check for tfvars files
  let siblingFiles: string[];
  try {
    siblingFiles = readdirSync(join(context.workspaceRoot, projectRoot));
  } catch {
    // If directory can't be read, skip this project
    return {};
  }

  const targetConfigurationParams: TargetsConfigurationParams = {
    backendProject:
      projectJsonContent.metadata?.[PLUGIN_NAME]?.backendProject || null,
    // check if projectRoot/tfvars/dev.tfvars and projectRoot/tfvars/prod.tfvars exist
    varFiles: {
      dev: siblingFiles.includes('tfvars/dev.tfvars'),
      prod: siblingFiles.includes('tfvars/prod.tfvars'),
    },
  };

  let projectTargets: ProjectConfiguration['targets'] = {};

  // Determine targets based on metadata (no fallback scanning needed)
  if (terraformProjectType === 'backend') {
    projectTargets = getBackendProjectTargets(targetConfigurationParams);
  } else if (targetConfigurationParams.backendProject) {
    // If backendProject metadata exists, it's a stateful module
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
