import {
  CreateNodesContextV2,
  CreateNodesV2,
  ProjectConfiguration,
  createNodesFromFiles,
} from '@nx/devkit';
import { readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import {
  getBackendProjectTargets,
  getModuleProjectTargets,
  getStatefulProjectTargets,
} from './targets';
import { TargetsConfigurationParams } from './targets';

// Expected format of the plugin options defined in nx.json
export type NxTerraformPluginOptions = unknown;

// File glob to find all the configuration files for this plugin
const terraformConfigGlob = '**/main.tf';

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
  options: NxTerraformPluginOptions,
  context: CreateNodesContextV2
) {
  const projectRoot = dirname(configFilePath);

  // Do not create a project if package.json or project.json isn't there.
  const siblingFiles = readdirSync(join(context.workspaceRoot, projectRoot));
  if (!siblingFiles.includes('project.json')) {
    return {};
  }

  const projectJsonContent: ProjectConfiguration = JSON.parse(
    readFileSync(
      resolve(context.workspaceRoot, projectRoot, 'project.json')
    ).toString()
  );

  const targetConfigurationParams: TargetsConfigurationParams = {
    backendProject: projectJsonContent.metadata?.backendProject || null,
    // check if projectRoot/varfiles/dev.tfvars and projectRoot/varfiles/prod.tfvars exist
    varFiles: {
      dev: siblingFiles.includes('tfvars/dev.tfvars'),
      prod: siblingFiles.includes('tfvars/prod.tfvars'),
    },
  };

  let projectTargets: ProjectConfiguration['targets'] = {};

  if (projectJsonContent.projectType === 'application') {
    if (targetConfigurationParams.backendProject) {
      projectTargets = getStatefulProjectTargets(targetConfigurationParams);
    } else {
      projectTargets = getBackendProjectTargets(targetConfigurationParams);
    }
  } else {
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
