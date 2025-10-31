import { formatFiles, runTasksInSerial, Tree } from '@nx/devkit';

import { PresetGeneratorSchema } from './schema';
import { terraformBackendGenerator } from '../terraform-backend/terraform-backend';
import initGenerator from '../init/init';

export async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema
) {
  const tasks = [];

  // Add nx-terraform plugin to the workspace
  await initGenerator(tree);

  // Scaffold terraform backend project
  await terraformBackendGenerator(tree, {
    name: 'terraform-setup',
    backendType: options.backendType,
  });

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}

export default presetGenerator;
