import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readProjectConfiguration } from '@nx/devkit';

import { presetGenerator } from './generator';
import { PresetGeneratorSchema } from './schema';

describe('preset generator', () => {
  const options: PresetGeneratorSchema = {
    projectName: 'projectName',
    backendType: 'local',
  };

  it('should run successfully', async () => {
    const tree = createTreeWithEmptyWorkspace();

    await presetGenerator(tree, options);

    const config = readProjectConfiguration(tree, 'terraform-setup');
    expect(config).toBeDefined();
  });
});
