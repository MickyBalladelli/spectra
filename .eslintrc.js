module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  plugins: ['react', 'jsx-a11y', 'prettier'],
  rules: {
    'no-unused-vars': 'off',
    'react/prop-types': 'warn',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off'
  },
  globals: {
    Map: 'readonly',
    Set: 'readonly',
    Promise: 'readonly'
  }
};