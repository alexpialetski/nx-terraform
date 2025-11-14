export default {
  displayName: 'nx-terraform-e2e',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@pshevche/act-test-runner)/)'],
  moduleNameMapper: {
    '^@pshevche/act-test-runner$':
      '<rootDir>/../../node_modules/@pshevche/act-test-runner/dist/index.js',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/nx-terraform-e2e',
  globalSetup: '../../tools/scripts/start-local-registry.ts',
  globalTeardown: '../../tools/scripts/stop-local-registry.ts',
};
