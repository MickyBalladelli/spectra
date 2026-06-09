// Jest configuration for React testing
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(jsx|js)$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@mui)/)',
  ],
  globals: {
    'import.meta.env': {},
  },
};
