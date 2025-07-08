const path = require('path');

module.exports = {
  displayName: 'Integration Tests',

  // Test environment
  testEnvironment: 'jsdom',

  // Test patterns
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.tsx',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  setupFiles: ['<rootDir>/tests/integration/env.ts'],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // Transform configuration - use ts-jest for TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  // Transform ignore patterns
  transformIgnorePatterns: ['node_modules/(?!(@tauri-apps/api)/)'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Longer timeouts for integration tests
  testTimeout: 30000,

  // Verbose output for debugging
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,
};
