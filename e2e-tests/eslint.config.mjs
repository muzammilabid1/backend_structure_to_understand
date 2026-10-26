import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    ...compat.extends('eslint:recommended', 'plugin:react/recommended', 'plugin:prettier/recommended'),
    {
        plugins: {
            'simple-import-sort': simpleImportSort
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.amd,
                ...globals.node,
                cy: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                Cypress: 'readonly'
            },

            ecmaVersion: 2020,
            sourceType: 'module'
        },

        settings: {
            react: {
                version: 'detect'
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
                }
            ],

            'lines-between-class-members': [
                'error',
                'always',
                {
                    exceptAfterSingleLine: true
                }
            ],

            'react/prop-types': ['warn'],
            'no-debugger': ['warn'],
            'no-unused-vars': ['warn'],
            'no-fallthrough': ['off'],

            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto'
                },
                {
                    usePrettierrc: true
                }
            ]
        }
    }
];
