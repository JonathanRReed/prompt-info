import { createRequire } from 'node:module';
import { defineConfig, globalIgnores } from 'eslint/config';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import imports from 'eslint-plugin-import';
import a11y from 'eslint-plugin-jsx-a11y';
import ts from 'typescript-eslint';
import globals from 'globals';
import localNext from './scripts/lint/next-rules.mjs';

// Preserve the effective eslint-config-next 16.3.8 configuration without its
// fast-glob -> micromatch -> braces dependency. Next's Babel parser remains
// provided by the application's existing Next package, as in the old preset.
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/eslint-parser');
const parser = { parse: babel.parse, parseForESLint: babel.parseForESLint };

export default defineConfig([
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    plugins: { react, 'react-hooks': hooks, import: imports, 'jsx-a11y': a11y, 'next-local': localNext },
    languageOptions: {
      parser,
      parserOptions: {
        requireConfigFile: false,
        sourceType: 'module',
        allowImportExportEverywhere: true,
        babelOptions: { presets: ['next/babel'], caller: { supportsTopLevelAwait: true } },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    settings: {
      react: { version: 'detect' },
      'import/parsers': { '@typescript-eslint/parser': ['.ts', '.mts', '.cts', '.tsx', '.d.ts'] },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
        typescript: { alwaysTryTypes: true },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      // 7.1.1 recommended expands to 16 rules, including compiler diagnostics.
      // Do not replace it with the two-rule legacy Hooks preset.
      ...hooks.configs.recommended.rules,
      'import/no-anonymous-default-export': 'warn',
      'react/no-unknown-property': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'next-local/no-html-link-for-pages': 'error',
      'next-local/no-location-assign-relative-destination': 'warn',
      // This interface intentionally uses effects to coordinate async model
      // loading, tokenization, theme hydration, observers, and animation state.
      // The React 19 rule treats those state-machine transitions as errors even
      // though they synchronize with external browser systems.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': ts.plugin },
    languageOptions: { parser: ts.parser, parserOptions: { sourceType: 'module' } },
  },
  {
    // The old unscoped Core Web Vitals layer also covered CommonJS files.
    files: ['**/*.cjs'],
    plugins: { 'next-local': localNext },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'next-local/no-html-link-for-pages': 'error',
      'next-local/no-location-assign-relative-destination': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
]);
