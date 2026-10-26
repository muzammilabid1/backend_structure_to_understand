import { defineConfig } from 'cypress';

const isCi = !!(process.env.CI || process.env.GITHUB_ACTIONS);

export default defineConfig({
    defaultBrowser: 'chromium',
    viewportWidth: 1200,
    viewportHeight: 1000,
    defaultCommandTimeout: 60000,
    requestTimeout: 15000,
    chromeWebSecurity: false,
    env: {
        HOSTED_URL: 'http://localhost:3000/',
        GRAPHQL_ENDPOINT: 'http://localhost:3007/graphql',
        FAIL_FAST_ENABLED: false, // disable FAIL_FAST except when required for specific environments
        LWP_JWT_SECRET: '$2y$12$ScZusrKd/mTM0UjJVjhEq./8vJBfiXY0Q.LzDALfiX3RIZ8o8a6cW' // disable FAIL_FAST except when required for specific environments
    },
    retries: {
        runMode: 2,
        openMode: 0
    },
    projectId: 'i2yiyh',
    e2e: {
        // We've imported your old cypress plugins here.
        // You may want to clean this up later by importing these.
        setupNodeEvents(on, config) {
            require('cypress-fail-fast/plugin')(on, config);

            return require('./cypress/plugins/index.js')(on, config);
        },
        experimentalStudio: true,
        supportFile: 'cypress/support/commands.js',
        specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}'
    },
    downloadsFolder: 'cypress/downloads',
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: isCi ? 0 : 50
});
