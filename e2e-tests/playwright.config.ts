import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './playwright',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 2 : 0,
    timeout: 600_000,
    reporter: process.env.CI
        ? [
              // CI reporters
              ['list', { printSteps: true }],
              ['html', { outputFile: 'e2e-tests/playwright-report', open: 'never' }],
              ['json', { outputFile: 'e2e-tests/playwright-report/test-results.json' }]
          ]
        : [
              // Local reporters
              ['list', { printSteps: true }],
              ['html', { open: 'on-failure', outputFile: 'e2e-tests/playwright-report' }],
              ['json', { outputFile: 'e2e-tests/playwright-report/test-results.json' }]
          ],

    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,

    use: {
        // Must be a hostname (not an IP) so the frontend's auth cookies, which carry
        // `Domain=localhost` locally, are accepted by the browser.
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
        testIdAttribute: 'data-test',
        headless: true
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
