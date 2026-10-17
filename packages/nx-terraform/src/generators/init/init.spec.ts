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

  it('should not add @cdktf/hcl2json to the host workspace (it is a plugin dependency)', async () => {
    const tree = createTreeWithEmptyWorkspace(options);

    await initGenerator(tree);

    const packageJson = readJson(tree, 'package.json');
    expect(packageJson.devDependencies?.['@cdktf/hcl2json']).toBeUndefined();
    expect(packageJson.dependencies?.['@cdktf/hcl2json']).toBeUndefined();
  });
});
