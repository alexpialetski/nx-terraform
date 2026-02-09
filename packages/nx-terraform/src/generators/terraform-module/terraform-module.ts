import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  Tree,
  ProjectConfiguration,
} from '@nx/devkit';
import * as path from 'path';
import {
  TerraformModuleGeneratorNormalizedSchema,
  TerraformModuleGeneratorSchema,
} from './schema';
import { getBackendTypeFromProject } from './utils';
import { PLUGIN_NAME } from '../../constants';

export async function terraformModuleGenerator(
  tree: Tree,
  options: TerraformModuleGeneratorSchema
) {
  const projectRoot = `packages/${options.name}`;

  // Create project configuration.
  // backendProject in target metadata (not in options) so nx:run-commands doesn't pass it to terraform CLI.
  const projectConfig: ProjectConfiguration = {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}`,
    targets: {
      ...(options.backendProject && {
        'terraform-init': {
          metadata: {
            backendProject: options.backendProject,
          },
        },
      }),
    },
    metadata: {
      [PLUGIN_NAME]: {
        projectType: 'module',
      },
    },
  };

  // Note: Implicit dependencies to backend projects are now handled
  // automatically by the createDependencies API in the dependencies module

  addProjectConfiguration(tree, options.name, projectConfig);

  // Normalize options for template generation
  const normalizedOptions = normalizeOptions(tree, options);

  // Select template directory based on whether backend is used
  const templateDir = path.join(
    __dirname,
    'files',
    options.backendProject ? 'stateful-module' : 'simple-module'
  );

  generateFiles(tree, templateDir, projectRoot, normalizedOptions);

  await formatFiles(tree);
}

const normalizeOptions = (
  tree: Tree,
  options: TerraformModuleGeneratorSchema
): TerraformModuleGeneratorNormalizedSchema => ({
  ...options,
  backendProject: options.backendProject || null,
  backendType: getBackendTypeFromProject(tree, options.backendProject),
  ignoreFile: '.gitignore',
  tmpl: '', // Required to strip __tmpl__ suffix from template filenames
});

export default terraformModuleGenerator;
