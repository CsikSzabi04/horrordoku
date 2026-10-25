import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**', 'dist-electron/**', 'release/**', 'node_modules/**',
      '.work/**', 'memory*/**', '.dev-userdata/**', 'supabase/**', 'web/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  {
    // az e2e szkriptek a böngészőben futó részleteket (page.evaluate) is tartalmaznak
    files: ['scripts/e2e/*.mjs'],
    languageOptions: { globals: { document: 'readonly', getComputedStyle: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', window: 'readonly' } },
    rules: { 'no-empty': 'off' },
  },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' } } },
)
