// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Apply the default ESLint recommended rules
  eslint.configs.recommended,

  // Apply the recommended rules from typescript-eslint
  ...tseslint.configs.recommended,

  // Optional: Define specific configurations for TypeScript files
  {
    files: ['**/*.ts'],
    // Environment settings for Node.js
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...tseslint.globals.node, // Use Node.js globals
      },
    },
    // Optional: Add specific rules or overrides here
    rules: {
      // Example: require semicolons
      // 'semi': ['error', 'always'],
    },
  },

  // Ignore files in node_modules and build/dist directories
  {
    ignores: ['node_modules', 'dist', 'build'],
  }
);
