import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        reporters: [['verbose', {}]]
    },
    resolve: {
        conditions: ['@lwp/src']
    },
    environments: {
        ssr: {
            resolve: {
                conditions: ['@lwp/src']
            }
        }
    }
});
