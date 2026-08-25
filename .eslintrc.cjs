/* Architecture rules from CONTEXT.md are enforced here, not by convention.
 *
 * ESLint override semantics: for any given file, the LAST matching block wins
 * per rule (options are replaced, not merged). So each block below restates the
 * full pattern list that should apply to the files it matches. Blocks are
 * ordered general -> specific.
 */

const MOCK = {
  group: ['@/data/mock', '@/data/mock/**', '**/data/mock', '**/data/mock/**'],
  message:
    'UI code must not import the mock adapter. Reach data through useData() so swapping adapters touches zero UI code (CONTEXT.md §2).',
};

const DEMO = {
  group: ['@/demo', '@/demo/**'],
  message:
    'src/demo is deleted before client handoff. Only the sidebar badge slot and the Settings toggle may import it (CONTEXT.md §3).',
};

const CROSS_MODULE = {
  group: ['@/modules/*', '@/modules/*/**', '../../modules/*', '../../modules/*/**'],
  message:
    'Modules are islands: no cross-module imports. Use relative paths inside your own module; go through @/data, @/components, @/lib, @/layout for anything else (CONTEXT.md §3).',
};

const restrict = (...patterns) => ['error', { patterns }];

module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-restricted-imports': restrict(MOCK, DEMO),
  },
  overrides: [
    // Modules additionally may not see each other.
    {
      files: ['src/modules/**/*.{ts,tsx}'],
      rules: { 'no-restricted-imports': restrict(MOCK, DEMO, CROSS_MODULE) },
    },
    // The data layer is what owns the mock adapter; main.tsx picks one at boot.
    {
      files: ['src/data/**/*.{ts,tsx}', 'src/main.tsx'],
      rules: { 'no-restricted-imports': restrict(DEMO) },
    },
    // Demo code seeds through the public DataProvider only — never the adapter.
    {
      files: ['src/demo/**/*.{ts,tsx}'],
      rules: { 'no-restricted-imports': restrict(MOCK) },
    },
    // The two sanctioned demo touchpoints in core code.
    {
      files: ['src/layout/Sidebar.tsx'],
      rules: { 'no-restricted-imports': restrict(MOCK) },
    },
    {
      files: ['src/modules/settings/**/*.{ts,tsx}'],
      rules: { 'no-restricted-imports': restrict(MOCK, CROSS_MODULE) },
    },
  ],
};
