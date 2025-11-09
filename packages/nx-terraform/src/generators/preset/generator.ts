import { formatFiles, runTasksInSerial, Tree } from '@nx/devkit';

import { PresetGeneratorSchema } from './schema';
import { terraformBackendGenerator } from '../terraform-backend/terraform-backend';
import initGenerator from '../init/init';
import { terraformModuleGenerator } from '../terraform-module/terraform-module';

export async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema
) {
  const tasks = [];

  // Add nx-terraform plugin to the workspace
  await initGenerator(tree);

  // Scaffold terraform backend project only if backendType is provided
  if (options.backendType) {
    await terraformBackendGenerator(tree, {
      name: 'terraform-setup',
      backendType: options.backendType,
    });
  }

  // Scaffold terraform module
  // If backend exists, connect it; otherwise create a standalone module
  await terraformModuleGenerator(tree, {
    name: 'terraform-infra',
    ...(options.backendType && {
      backendProject: 'terraform-setup',
    }),
  });

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}

export default presetGenerator;
