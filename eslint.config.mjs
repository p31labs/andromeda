import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import configPrettier from 'eslint-config-prettier';

export default [
  {
    name: 'p31/equilibrium/prettier',
    plugins: { prettier: eslintPluginPrettier },
    rules: {
      ...configPrettier.rules,
      'prettier/prettier': 'warn',
    },
  },
  {
    name: 'p31/equilibrium/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.wrangler/**',
      '**/.astro/**',
      '**/*.config.*',
      '**/*.test.*',
      '**/*.spec.*',
      '**/__tests__/**',
      '**/_archive/**',
      '**/coverage/**',
      'firmware/**',
      'contracts/**',
      'wcds/**',
      'docs/**',
    ],
  },
  {
    name: 'p31/equilibrium/typescript',
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
