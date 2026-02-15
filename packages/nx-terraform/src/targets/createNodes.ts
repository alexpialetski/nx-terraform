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
import type {
  TerraformInitTargetMetadata,
  TerraformOutputTargetMetadata,
} from './type';
import { NxTerraformPluginOptions } from '../types';
import { getNxTerraformProjectMetadata } from '../utils/getNxTerraformProjectMetadata';

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

  const nxTerraformMetadata = getNxTerraformProjectMetadata(projectJsonContent);
  const terraformProjectType = nxTerraformMetadata?.projectType;

  if (!terraformProjectType) {
    // Not a Terraform project (no projectType metadata), skip
    return {};
  }

  const targetConfigurationParams = normalizeTargetOptions(projectJsonContent);

  let projectTargets: ProjectConfiguration['targets'] = {};

  // Determine targets based on metadata (no fallback scanning needed)
  if (terraformProjectType === 'backend') {
    projectTargets = getBackendProjectTargets(
      targetConfigurationParams,
      nxTerraformMetadata.backendType
    );
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
 * backendProject is read from terraform-init target's metadata; outputFormat and outputFile from terraform-output target's metadata.
 */
function normalizeTargetOptions(
  projectJsonContent: ProjectConfiguration
): TargetsConfigurationParams {
  const initTarget = projectJsonContent.targets?.['terraform-init'];
  const initMetadata = initTarget?.metadata as
    | TerraformInitTargetMetadata
    | undefined;
  const backendProject = initMetadata?.backendProject ?? null;

  const outputTarget = projectJsonContent.targets?.['terraform-output'];
  const outputMetadata = outputTarget?.metadata as
    | TerraformOutputTargetMetadata
    | undefined;
  const outputFormat = outputMetadata?.outputFormat ?? 'tfvars';
  const outputFile = outputMetadata?.outputFile ?? 'terraform-outputs.env';

  return {
    init: {
      backendProject,
    },
    output: {
      outputFormat,
      outputFile,
    },
  };
}
