import { defineConfig, devices } from '@playwright/test'

/**
 * The dashboard has no login of its own — the session is minted by the main platform — so this
 * suite cannot be exercised against a server of its own. It runs against a stack that is already
 * up, the way the e2e-tests workspace does, and signs its tokens with the platform's real
 * LWP_JWT_SECRET. e2e/support/global-setup.ts refuses to start if either is missing.
 *
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3002'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: true,
  // Room for one throttle wait: logins are capped at 10 a minute per IP and a full run spends
  // several sessions, so running the suite twice in quick succession pauses rather than fails.
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
