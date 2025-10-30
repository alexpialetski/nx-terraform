import { formatFiles, runTasksInSerial, Tree } from '@nx/devkit';

import { PresetGeneratorSchema } from './schema';
import { terraformBackendGenerator } from '../terraform-backend/terraform-backend';

export async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema
) {
  const tasks = [];

  // Scaffold terraform backend project
  await terraformBackendGenerator(tree, {
    name: 'terraform-setup',
    backendType: options.backendType,
  });

  await formatFiles(tree);

  return runTasksInSerial(...tasks);
}

export default presetGenerator;
