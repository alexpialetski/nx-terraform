import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        // TODO: investigate while ignoring "files" of generators causes false positives
        'off',
        {
          includeTransitiveDependencies: false,
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/src/generators/terraform-backend/files/**/*',
          ],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/package.json', '**/package.json', '**/generators.json'],
    rules: {
      '@nx/nx-plugin-checks': 'error',
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
