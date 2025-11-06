import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import {
  TerraformBackendGeneratorNormalizedSchema,
  TerraformBackendGeneratorSchema,
} from './schema';
import { PLUGIN_NAME } from '../../constants';

export async function terraformBackendGenerator(
  tree: Tree,
  options: TerraformBackendGeneratorSchema
) {
  const projectRoot = `packages/${options.name}`;
  const normalizedOptions = normalizeOptions(options);

  // Minimal project.json configuration
  addProjectConfiguration(tree, normalizedOptions.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}`,
    targets: {},
    metadata: {
      [PLUGIN_NAME]: {
        projectType: 'backend',
        backendType: normalizedOptions.backendType,
      },
    },
  });

  // Select template directory based on backendType
  const templateDir = path.join(
    __dirname,
    'files',
    normalizedOptions.backendType === 'aws-s3'
      ? 'aws-s3-backend'
      : 'local-backend'
  );

  generateFiles(tree, templateDir, projectRoot, normalizedOptions);

  // No post-processing needed; EJS handled bucket name logic.
  await formatFiles(tree);
}

const normalizeOptions = (
  options: TerraformBackendGeneratorSchema
): TerraformBackendGeneratorNormalizedSchema => ({
  ...options,
  bucketNamePrefix: options.bucketNamePrefix || 'terraform-state',
  ignoreFile: '.gitignore',
});

export default terraformBackendGenerator;
