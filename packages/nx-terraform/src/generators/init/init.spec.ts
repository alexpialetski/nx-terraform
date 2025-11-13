import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readJson, readNxJson } from '@nx/devkit';

import { initGenerator } from './init';
import { InitGeneratorSchema } from './schema';

describe('init generator', () => {
  const options: InitGeneratorSchema = {};

  it('should run successfully', async () => {
    const tree = createTreeWithEmptyWorkspace(options);

    await initGenerator(tree);

    expect(readNxJson(tree).plugins).toEqual(
      expect.arrayContaining([
        {
          plugin: 'nx-terraform',
          options: {},
        },
      ])
    );
  });

  it('should add @cdktf/hcl2json as dev dependency', async () => {
    const tree = createTreeWithEmptyWorkspace(options);

    await initGenerator(tree);

    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies['@cdktf/hcl2json']).toBe('^0.21.0');
  });
});
