import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { readNxJson } from '@nx/devkit';

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
});
