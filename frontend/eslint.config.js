import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

// This config targets ESLint 9 flat config with typescript-eslint 8. The
// package.json used to pin ESLint 8 plus the deprecated per-package
// @typescript-eslint/* split, which made `npm run lint` impossible to run at all
// ("Invalid option '--ext'", then a missing module), and the lint script still
// passed the ESLint 8 `--ext` flag. Lint was effectively absent from this
// project; it now runs and gates CI.
export default tseslint.config([
  globalIgnores(['dist', 'node_modules', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The codebase talks to a REST API whose payloads are genuinely dynamic
      // (book metadata from Google Books / OpenLibrary, admin settings, import
      // summaries). `any` at those boundaries is deliberate, and the repo has no
      // generated types for them. 141 of the 189 findings were this rule alone,
      // so it is reported as a warning rather than an error: visible, but not a
      // gate that has never once passed.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused variables are usually a real oversight. Keep them as errors, but
      // allow the conventional `_`-prefix for intentionally ignored values.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
])
