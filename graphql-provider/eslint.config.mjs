import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    {
        ignores: ['**/.eslintrc.js', '**/*.js', 'cypress.config.ts', 'eslint.config.mjs', 'cypress/**/*']
    },
    ...compat.extends(
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended'
    ),
    {
        plugins: {
            '@typescript-eslint': typescriptEslint,
            prettier,
            'simple-import-sort': simpleImportSort
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: 'module',

            parserOptions: {
                project: `${__dirname}/tsconfig.json`
            }
        },

        rules: {
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',

            'padding-line-between-statements': [
                'error',
                {
                    blankLine: 'always',
                    prev: 'var',
                    next: 'return'
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: 'return'
                },
                {
                    blankLine: 'always',
                    prev: ['const', 'let', 'var', 'block', 'block-like'],
                    next: '*'
                },
                {
                    blankLine: 'any',
                    prev: ['const', 'let', 'var'],
                    next: ['const', 'let', 'var']
                },
                {
                    blankLine: 'always',
                    prev: '*',
                    next: ['case', 'default']
                },
                {
                    blankLine: 'any',
                    prev: 'case',
                    next: 'case'
                }
            ],

            'lines-between-class-members': [
                'error',
                'always',
                {
                    exceptAfterSingleLine: true
                }
            ],

            '@typescript-eslint/no-explicit-any': ['warn'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-module-boundary-types': ['off'],
            '@typescript-eslint/explicit-function-return-type': ['warn'],

            '@typescript-eslint/no-empty-object-type': ['warn'],

            'no-irregular-whitespace': [
                'warn',
                {
                    skipComments: true
                }
            ],

            'no-async-promise-executor': ['warn'],
            'no-case-declarations': ['off'],
            '@typescript-eslint/no-empty-function': ['warn'],

            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto'
                }
            ],

            'require-await': 'off',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-floating-promises': 'error'
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        rules: {}
    },
    {
        files: ['**/*.spec.ts'],

        rules: {
            '@typescript-eslint/no-floating-promises': 'off'
        }
    }
];
