/**
 * @file Common ESLint rules: Airbnb with TypeScript, JSX accessibility, React hooks and JSDoc. Ignores,
 * globals and rules that only this repository needs go to eslint.local.mjs; they cannot override a rule set here.
 */

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import local from './eslint.local.mjs';

const TS = ['**/*.{ts,tsx,mts,cts}'];
const TESTS = ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'];
const TOOLING = ['scripts/**', 'tests/**', '*.config.*'];

export default defineConfig([
    globalIgnores([
        'build/',
        'dist/',
        'coverage/',
        'node_modules/',
        'test-results/',
        'playwright-report/',
    ]),
    // Local entries come first so that the common rules below always win.
    ...local,
    js.configs.recommended,
    plugins.stylistic,
    plugins.importX,
    plugins.reactA11y,
    plugins.reactHooks,
    plugins.typescriptEslint,
    ...configs.base.recommended,
    // eslint-plugin-react 7.37 crashes on ESLint 10; every other part of Airbnb's React config runs.
    ...configs.react.recommended.filter(({ name }) => name !== 'airbnb/config/react'),
    ...configs.base.typescript,
    ...configs.react.typescript.filter(({ name }) => name !== 'airbnb/config/react-typescript-react'),
    {
        files: TS,
        extends: [tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
        rules: {
            // Four-space indentation and 120 columns instead of Airbnb's 2 and 100.
            '@stylistic/indent': ['error', 4, { SwitchCase: 1 }],
            '@stylistic/jsx-indent-props': ['error', 4],
            '@stylistic/max-len': ['error', {
                code: 120,
                tabWidth: 4,
                ignoreUrls: true,
                ignoreRegExpLiterals: true,
            }],
            curly: ['error', 'all'],
            'arrow-body-style': 'off',
            'class-methods-use-this': 'off',
            'import-x/prefer-default-export': 'off',
            'import-x/order': ['error', {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
                'newlines-between': 'always',
                alphabetize: { order: 'asc', caseInsensitive: true },
            }],
            // for..of is native in every supported browser; the regenerator concern no longer applies.
            'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
            // Release and build steps await one after another on purpose.
            'no-await-in-loop': 'off',
            'no-console': ['error', { allow: ['debug', 'warn', 'error'] }],
            // `void promise` marks a promise that is deliberately not awaited.
            'no-void': ['error', { allowAsStatement: true }],
        },
    },
    {
        files: TS,
        rules: {
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
        },
    },
    {
        files: TS,
        extends: [jsdoc.configs['flat/recommended-typescript-error']],
        rules: {
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns-type': 'off',
            'jsdoc/require-throws-type': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-throws': 'error',
            'jsdoc/require-file-overview': 'error',
            'jsdoc/multiline-blocks': ['error', { noSingleLineBlocks: true }],
            'jsdoc/lines-before-block': 'error',
            'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
            'jsdoc/check-tag-names': ['error', { definedTags: ['note', 'vitest-environment'] }],
            'jsdoc/sort-tags': ['error', {
                tagSequence: [
                    { tags: ['file'] },
                    { tags: ['template'] },
                    { tags: ['note'] },
                    { tags: ['see'] },
                    { tags: ['param'] },
                    { tags: ['returns'] },
                    { tags: ['throws'] },
                    { tags: ['example'] },
                ],
            }],
            'jsdoc/require-jsdoc': ['error', {
                // An empty stub inserted by --fix only moves the error to require-description.
                enableFixer: false,
                require: {
                    ClassDeclaration: true,
                    MethodDefinition: true,
                    FunctionDeclaration: true,
                },
                contexts: [
                    'TSInterfaceDeclaration',
                    'TSInterfaceDeclaration TSPropertySignature',
                    'TSTypeAliasDeclaration',
                    'Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
                    'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator'
                        + ' > ArrowFunctionExpression',
                ],
            }],
            'jsdoc/require-description': ['error', {
                contexts: [
                    'ClassDeclaration',
                    'MethodDefinition',
                    'FunctionDeclaration',
                    'TSInterfaceDeclaration',
                    'TSTypeAliasDeclaration',
                ],
            }],
        },
    },
    {
        files: TESTS,
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-file-overview': 'off',
            'jsdoc/require-description': 'off',
            // Test doubles pass method references and build loosely typed fakes on purpose.
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/require-await': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
    {
        files: TOOLING,
        languageOptions: { globals: globals.node },
        rules: {
            'no-console': 'off',
            'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
            // Scripts run directly by Node import .ts files with their extension; bundled code does not.
            'import-x/extensions': 'off',
        },
    },
]);
