import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readNxJson, readProjectConfiguration } from '@nx/devkit';

import { presetGenerator } from './generator';
import { PresetGeneratorSchema } from './schema';

describe('preset generator', () => {
  it('should run successfully with backendType', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const options: PresetGeneratorSchema = {
      projectName: 'projectName',
      backendType: 'local',
    };

    await presetGenerator(tree, options);

    // Verify terraform-setup backend project is created
    const backendConfig = readProjectConfiguration(tree, 'terraform-setup');
    expect(backendConfig).toBeDefined();
    expect(backendConfig.metadata?.['nx-terraform']?.projectType).toBe('backend');

    // Verify terraform-infra stateful module is created
    const infraConfig = readProjectConfiguration(tree, 'terraform-infra');
    expect(infraConfig).toBeDefined();
    expect(infraConfig.projectType).toBe('application');
    expect(infraConfig.metadata?.['nx-terraform']?.projectType).toBe('module');
    expect(
      (infraConfig.targets?.['terraform-init']?.metadata as { backendProject?: string })
        ?.backendProject
    ).toBe('terraform-setup');

    expect(readNxJson(tree).plugins).toEqual(
      expect.arrayContaining([
        {
          plugin: 'nx-terraform',
          options: {},
        },
      ])
    );
  });

  it('should run successfully without backendType', async () => {
    const tree = createTreeWithEmptyWorkspace();
    const options: PresetGeneratorSchema = {
      projectName: 'projectName',
    };

    await presetGenerator(tree, options);

    // Verify terraform-setup backend project is NOT created
    expect(() => readProjectConfiguration(tree, 'terraform-setup')).toThrow();

    // Verify terraform-infra standalone module is created
    const infraConfig = readProjectConfiguration(tree, 'terraform-infra');
    expect(infraConfig).toBeDefined();
    expect(infraConfig.projectType).toBe('application');
    expect(infraConfig.metadata?.['nx-terraform']?.projectType).toBe('module');
    expect(infraConfig.targets?.['terraform-init']).toBeUndefined();

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
