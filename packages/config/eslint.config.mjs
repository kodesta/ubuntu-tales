import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Shared flat ESLint config. Apps call createConfig({ react: true, browser: true }).
 */
export function createConfig({ react = false, browser = false } = {}) {
  const configs = [
    {
      ignores: [
        '**/dist/**',
        '**/coverage/**',
        '**/routeTree.gen.ts',
        '**/openapi.json',
        '**/node_modules/**',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx,mjs,cjs}'],
      languageOptions: {
        globals: {
          ...(browser ? globals.browser : globals.node),
          ...globals.es2022,
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        'no-console': 'off',
        eqeqeq: ['error', 'smart'],
      },
    },
  ];

  if (react) {
    configs.push({
      files: ['**/*.{ts,tsx}'],
      plugins: { 'react-hooks': reactHooks },
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    });
  }

  return configs;
}
