import type { ProjectConfiguration } from '@nx/devkit';
import type { NxTerraformProjectMetadata } from '../types';
import { PLUGIN_NAME } from '../constants';

/**
 * Extracts nx-terraform plugin metadata from a project configuration.
 * Returns undefined if the project has no nx-terraform metadata.
 */
export function getNxTerraformProjectMetadata(
  projectConfig: ProjectConfiguration
): NxTerraformProjectMetadata | undefined {
  return projectConfig.metadata?.[PLUGIN_NAME] as
    | NxTerraformProjectMetadata
    | undefined;
}
