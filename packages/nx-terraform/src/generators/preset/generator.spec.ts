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

    // Verify terraform-setup backend project is created
    const backendConfig = readProjectConfiguration(tree, 'terraform-setup');
    expect(backendConfig).toBeDefined();

    // Verify terraform-infra stateful module is created
    const infraConfig = readProjectConfiguration(tree, 'terraform-infra');
    expect(infraConfig).toBeDefined();
    expect(infraConfig.projectType).toBe('application');
    expect(infraConfig.metadata?.backendProject).toBe('terraform-setup');

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
