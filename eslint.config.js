import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// Accessibility rules are errors (improvement 20; the existing warnings were
// fixed in F2). Two rules are tuned, both covered at runtime by axe in the
// e2e suite, which sees the real DOM:
// - control-has-associated-label cannot follow labels linked by useId()
//   (htmlFor/id) and flags correctly labelled fields, so inputs are skipped;
// - no-autofocus: focus is managed on purpose (Modal moves it to the first
//   field; single-purpose screens like Entrar focus their only field).
const a11yRules = {
  ...Object.fromEntries(Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, 'error'])),
  'jsx-a11y/control-has-associated-label': ['error', { ignoreElements: ['input', 'textarea', 'select'] }],
  'jsx-a11y/no-autofocus': 'off',
}

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
      ...a11yRules,
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
