import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // .claude/ holds agent worktrees: full checkouts that would otherwise be linted as a second
    // project root (typescript-eslint then can't infer tsconfigRootDir).
    { ignores: ['dist', 'build', 'node_modules', '.claude'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
            parserOptions: { tsconfigRootDir: import.meta.dirname },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        files: ['src/components/ui/icons.tsx'],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['scripts/**/*.{ts,js}'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
            parserOptions: { tsconfigRootDir: import.meta.dirname },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/ban-ts-comment': 'warn',
        },
    },
);
