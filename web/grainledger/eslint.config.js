import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/api/**/*.ts', 'src/shared/**/*.{ts,tsx}', 'src/pwa/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          regex: '^(?:@/|(?:\\.\\./)+)(?:app|features|components)(?:/|$)',
          message: 'Keep app composition and feature workflows outside infrastructure and shared code.',
        }],
      }],
    },
  },
  {
    files: ['src/api/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: ['react', 'react-dom', 'react-router-dom', 'zustand'],
        patterns: [{
          regex: '^(?:@/|(?:\\.\\./)+)(?:app|features|components|pwa|shared/ui)(?:/|$)',
          message: 'Inject session and connectivity through the app provider. API modules own HTTP contracts.',
        }],
      }],
    },
  },
])
