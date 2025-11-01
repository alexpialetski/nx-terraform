import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
  readProjectConfiguration,
  ProjectConfiguration,
} from '@nx/devkit';
import * as path from 'path';
import {
  TerraformModuleGeneratorNormalizedSchema,
  TerraformModuleGeneratorSchema,
} from './schema';

export async function terraformModuleGenerator(
  tree: Tree,
  options: TerraformModuleGeneratorSchema
) {
  const projectRoot = `packages/${options.name}`;
  const normalizedOptions = normalizeOptions(options);

  // Determine project type based on whether backendProject is provided
  const projectType = normalizedOptions.backendProject
    ? 'application'
    : 'library';

  // Create project configuration
  const projectConfig: ProjectConfiguration = {
    root: projectRoot,
    projectType: projectType,
    sourceRoot: `${projectRoot}`,
    targets: {},
  };

  // Add metadata for stateful modules (application with backend)
  if (normalizedOptions.backendProject) {
    // Verify backend project exists
    try {
      const backendConfig = readProjectConfiguration(
        tree,
        normalizedOptions.backendProject
      );
      if (!backendConfig) {
        throw new Error(
          `Backend project "${normalizedOptions.backendProject}" not found.`
        );
      }
    } catch (error) {
      throw new Error(
        `Backend project "${normalizedOptions.backendProject}" not found. Please create it first using the terraform-backend generator.`
      );
    }

    projectConfig.metadata = {
      backendProject: normalizedOptions.backendProject,
    };
    projectConfig.implicitDependencies = [normalizedOptions.backendProject];
  }

  addProjectConfiguration(tree, normalizedOptions.name, projectConfig);

  // Select template directory based on whether backend is used
  const templateDir = path.join(
    __dirname,
    'files',
    normalizedOptions.backendProject ? 'stateful-module' : 'simple-module'
  );

  generateFiles(tree, templateDir, projectRoot, normalizedOptions);

  await formatFiles(tree);
}

const normalizeOptions = (
  options: TerraformModuleGeneratorSchema
): TerraformModuleGeneratorNormalizedSchema => ({
  ...options,
  backendProject: options.backendProject || null,
  backendType: options.backendType || null,
  ignoreFile: '.gitignore',
  tmpl: '', // Required to strip __tmpl__ suffix from template filenames
});

export default terraformModuleGenerator;

