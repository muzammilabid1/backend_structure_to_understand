import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

import pageTypePlugin from './eslint-rules/eslint-plugin-page-type.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    ...compat.extends(
        'eslint:recommended',
        'plugin:@next/next/recommended',
        'plugin:react/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:prettier/recommended'
    ),
    {
        ignores: ['.next']
    },
    {
        plugins: {
            'simple-import-sort': simpleImportSort,
            'page-type': pageTypePlugin
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.amd,
                ...globals.node
            },

            ecmaVersion: 2020,
            sourceType: 'module',

            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
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
            'jsx-a11y/alt-text': ['off'],
            'jsx-a11y/no-autofocus': ['off'],
            'jsx-a11y/click-events-have-key-events': ['off'],
            'jsx-a11y/no-static-element-interactions': ['off'],
            'jsx-a11y/no-noninteractive-element-interactions': ['off'],
            'jsx-a11y/img-redundant-alt': ['off'],
            'react/jsx-key': ['off'],
            'react/no-unescaped-entities': ['warn'],
            'react/jsx-no-duplicate-props': ['warn'],
            'no-fallthrough': ['off'],
            'react/react-in-jsx-scope': ['off'],

            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto'
                },
                {
                    usePrettierrc: true
                }
            ],

            '@next/next/no-duplicate-head': ['off'],
            '@next/next/no-page-custom-font': ['off']
        }
    },
    {
        files: ['**/pages/**/*.{js,jsx,ts,tsx}'],
        ignores: ['**/pages/api/**', '**/pages/_app.*', '**/pages/_document.*'],
        plugins: {
            'page-type': pageTypePlugin
        },

        rules: {
            'page-type/require-page-type': 'error',
            'page-type/require-page-title': 'error'
        }
    },
    ...compat.extends('plugin:@typescript-eslint/recommended').map((config) => ({
        ...config,
        files: ['**/*.tsx']
    })),
    {
        files: ['**/*.tsx'],

        languageOptions: {
            parser: tsParser
        }
    }
];
