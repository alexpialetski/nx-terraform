import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readNxJson, readProjectConfiguration } from '@nx/devkit';

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

    expect(readNxJson(tree).plugins).toEqual(
      expect.arrayContaining([
        {
          plugin: 'nx-terraform',
          options: {},
        },
      ])
    );
  });
});
