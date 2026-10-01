import { defineConfig } from 'oxfmt'

export default defineConfig({
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  svelte: {},
  sortImports: false,
  sortPackageJson: false,
  sortTailwindcss: false,
  ignorePatterns: ['apps/web/src/styles/**'],
})
