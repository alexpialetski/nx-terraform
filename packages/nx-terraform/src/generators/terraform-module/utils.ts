import { readProjectConfiguration, Tree } from '@nx/devkit';
import { TerraformBackendType } from '../../types';
import { PLUGIN_NAME } from '../../constants';

/**
 * Determines the backendType from the backend project metadata.
 * Returns null if no backendProject is provided.
 * Throws an error if the backend project doesn't exist or is missing backendType in metadata.
 */
export function getBackendTypeFromProject(
  tree: Tree,
  backendProject: string | undefined
): TerraformBackendType | null {
  if (!backendProject) {
    return null;
  }

  // Verify backend project exists and get backendType from metadata
  const backendConfig = readProjectConfiguration(tree, backendProject);

  // Get backendType from backend project metadata
  const backendTypeFromMetadata =
    backendConfig.metadata?.[PLUGIN_NAME]?.backendType;

  if (!backendTypeFromMetadata) {
    throw new Error(
      `Backend project "${backendProject}" is missing backendType in metadata. Please recreate it using the terraform-backend generator.`
    );
  }

  return backendTypeFromMetadata as TerraformBackendType;
}
