/**
 * This script starts a local registry for e2e testing purposes.
 * It is meant to be called in jest's globalSetup.
 */

/// <reference path="registry.d.ts" />

import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';

export default async () => {
  // local registry target to run
  const localRegistryTarget = '@nx-terraform/source:local-registry';
  // storage folder for the local registry
  const storage = './tmp/nx-terraform-local-registry';

  // global.stopLocalRegistry = await startLocalRegistry({
  //   localRegistryTarget,
  //   storage,
  //   clearStorage: true,
  // });
  global.stopLocalRegistry = () => {
    console.log('Local registry not started');
  };

  await releaseVersion({
    specifier: '0.0.0-e2e',
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    versionActionsOptionsOverrides: {
      skipLockFileUpdate: true,
    },
  });
  await releasePublish({
    tag: 'e2e',
  });
};
