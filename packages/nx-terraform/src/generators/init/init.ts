import { formatFiles, readNxJson, Tree, updateNxJson } from '@nx/devkit';

const PLUGIN_NAME = 'nx-terraform';

export async function initGenerator(tree: Tree) {
  const nxJson = readNxJson(tree) || {};

  const hasPlugin = nxJson.plugins?.some((p) =>
    typeof p === 'string' ? p === PLUGIN_NAME : p.plugin === PLUGIN_NAME
  );

  if (!hasPlugin) {
    if (!nxJson.plugins) {
      nxJson.plugins = [];
    }

    nxJson.plugins = [
      ...nxJson.plugins,
      {
        plugin: PLUGIN_NAME,
        options: {},
      },
    ];
  }

  updateNxJson(tree, nxJson);

  await formatFiles(tree);
}

export default initGenerator;
