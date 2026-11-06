import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// jsx-a11y starts as warnings: the current screens predate the accessibility
// scheme (improvement 20). Each rule becomes an error as the UI v2 screens
// replace the old ones (see the implementation plan, phase 2).
const a11yAsWarnings = Object.fromEntries(
  Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, 'warn']),
)

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'prototype', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...a11yAsWarnings,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Deprecated in jsx-a11y; label-has-associated-control covers it.
      'jsx-a11y/label-has-for': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Playwright fixtures call `use()`, which is not a React hook.
    files: ['e2e/**'],
    languageOptions: { globals: globals.node },
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['src/test/**', '**/*.test.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
