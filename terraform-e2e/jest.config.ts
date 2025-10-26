export default {
  displayName: 'terraform-e2e',
  preset: '../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    // Only transform TypeScript; let compiled JS in dist/ run natively
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json', diagnostics: false },
    ],
  },
  transformIgnorePatterns: [
    // Skip transforming built plugin output
    '/dist/',
  ],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../coverage/terraform-e2e',
  globalSetup: '../tools/scripts/start-local-registry.ts',
  globalTeardown: '../tools/scripts/stop-local-registry.ts',
};
