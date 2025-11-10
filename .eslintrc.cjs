module.exports = {
    root: true,
    extends: [
        'airbnb',
        'airbnb-typescript',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    plugins: [
        'react',
        '@typescript-eslint',
        'import',
        'promise',
        'jsx-a11y',
        'import-newlines',
    ],
    rules: {
        // Override the default 2 spaces to use 4 spaces instead
        // NOTE: @typescript-eslint/indent has a known bug in ESLint 8 (GitHub issue #16192)
        // that causes stack overflow on complex JSX. Since ESLint 8 is deprecated and won't
        // be fixed, we disable it and rely only on react/jsx-indent rules for JSX indentation.
        indent: 'off',
        '@typescript-eslint/indent': 'off',
        'react/jsx-indent': ['warn', 4],
        'react/jsx-indent-props': ['warn', 4],

        // Allow arrow functions to use block bodies with explicit return
        'arrow-body-style': 'off',

        // Allow unused parameters with underscore prefix
        '@typescript-eslint/no-unused-vars': ['error', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
        }],

        // Disable rule that prevents using 'new' for side effects
        'no-new': 'off',

        // Allow await in loops for sequential processing
        'no-await-in-loop': 'off',

        // Allow underscore dangle for special variables like __dirname and __filename
        'no-underscore-dangle': 'off',

        // Disable naming convention rule completely
        '@typescript-eslint/naming-convention': 'off',

        // Using the import-newlines plugin to format imports exactly as needed
        'import-newlines/enforce': ['error', {
            items: 3,
            'max-len': 120,
            semi: true,
            forceSingleLine: true,
        }],

        // Force imports with more than 5 elements to have each property on a separate line
        'object-curly-newline': 'off',

        // Handle items in multiline imports
        'object-property-newline': ['error', {
            allowAllPropertiesOnSameLine: true,
        }],

        // This will enforce spacing for import statements
        'object-curly-spacing': ['error', 'always'],

        // These rules help format imports consistently
        'comma-spacing': ['error', { before: false, after: true }],
        'comma-style': ['error', 'last'],
        'no-multi-spaces': 'error',
        'import/newline-after-import': ['error', { count: 1 }],

        // Additional customizations can be added here
        'import/prefer-default-export': 'off',
        'max-len': ['error', { code: 120 }],
        'max-classes-per-file': 'off',
        'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
        'class-methods-use-this': 'off',
        'import/extensions': ['error', 'never'],
        'func-names': 'off',
        'no-console': 'off',

        // Enforce curly braces for all control statements (if, else, for, while, do)
        // This prevents hard-to-read one-line statements and potential bugs
        curly: ['error', 'all'],
        'nonblock-statement-body-position': ['error', 'below'],

        // Import order rule to enforce external imports first, then internal imports, then style imports
        'import/order': ['error', {
            groups: [
                'builtin', // Node.js built-in modules
                'external', // External packages like react, webextension-polyfill
                'internal', // Internal imports (those starting with ../)
                'parent', // Imports from parent directories
                'sibling', // Imports from sibling files
                'index', // Index imports
                'object', // Object imports
                'type', // Type imports
            ],
            pathGroups: [
                {
                    pattern: '*.css',
                    group: 'index',
                    position: 'after',
                },
            ],
            pathGroupsExcludedImportTypes: ['builtin'],
            'newlines-between': 'always',
            alphabetize: {
                order: 'asc',
                caseInsensitive: true,
            },
        }],
    },
    settings: {
        react: {
            version: 'detect',
        },
        'import/resolver': {
            node: {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            },
            typescript: {
                alwaysTryTypes: true,
                project: './tsconfig.json',
            },
        },
    },
    overrides: [
        {
            // This special rule applies only to imports with 4+ items
            files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
            rules: {
                'object-property-newline': ['error', {
                    // Normal rule for most objects
                    allowAllPropertiesOnSameLine: true,
                }],
                // This is the key rule for multiline imports
                'function-call-argument-newline': ['error', 'consistent'],
                '@typescript-eslint/comma-dangle': ['error', {
                    arrays: 'always-multiline',
                    objects: 'always-multiline',
                    imports: 'always-multiline',
                    exports: 'always-multiline',
                    functions: 'always-multiline',
                }],
            },
        },
        {
            // Allow build scripts and config files to import from devDependencies
            files: [
                '**/scripts/**/*.ts',
                '**/scripts/**/*.js',
                '**/*.config.ts',
                '**/*.config.js',
                '**/*.config.cjs',
                '**/vitest.setup.ts',
                '**/tests/**/*.ts',
            ],
            rules: {
                'import/no-extraneous-dependencies': 'off',
            },
        },
        {
            // Configure browser environment for sample extension files
            files: ['test/sample-extension/**/*.js'],
            env: {
                browser: true,
                webextensions: true,
            },
            rules: {
                'no-undef': 'off',
                'no-alert': 'off',
                'no-plusplus': 'off',
                radix: 'off',
                '@typescript-eslint/no-use-before-define': 'off',
                'consistent-return': 'off',
            },
        },
    ],
};
