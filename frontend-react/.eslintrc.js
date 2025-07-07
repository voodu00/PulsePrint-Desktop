module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: ['react-app', 'react-app/jest', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // Prettier integration
    'prettier/prettier': 'error',

    // Code quality rules aligned with SonarCloud
    'no-console': 'off', // Allow console statements for logging utility
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Handled by TypeScript

    // Complexity rules - adjusted for React components
    complexity: ['warn', { max: 15 }], // Increased for React components
    'max-depth': ['warn', { max: 5 }], // Slightly increased for nested JSX
    'max-lines-per-function': [
      'warn',
      { max: 100, skipBlankLines: true, skipComments: true }, // Increased for React components
    ],
    'max-params': ['warn', { max: 5 }], // Slightly increased for React props

    // Best practices
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    curly: 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    radix: 'error',

    // React specific
    'react/jsx-uses-react': 'off', // React 17+
    'react/react-in-jsx-scope': 'off', // React 17+
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'max-lines-per-function': 'off',
        complexity: 'off',
      },
    },
    {
      // More lenient rules for React components
      files: ['**/components/**/*.tsx', '**/contexts/**/*.tsx'],
      rules: {
        'max-lines-per-function': [
          'warn',
          { max: 500, skipBlankLines: true, skipComments: true },
        ],
        complexity: ['warn', { max: 25 }],
      },
    },
    {
      // Service files can be more complex
      files: ['**/services/**/*.ts'],
      rules: {
        'max-lines-per-function': [
          'warn',
          { max: 150, skipBlankLines: true, skipComments: true },
        ],
        complexity: ['warn', { max: 18 }],
      },
    },
    {
      // Utility files
      files: ['**/utils/**/*.ts'],
      rules: {
        'no-console': 'off', // Allow console in logger utility
        complexity: ['warn', { max: 15 }],
      },
    },
  ],
};
