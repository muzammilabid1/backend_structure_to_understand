import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Mirrors the `@/*` path in tsconfig.json, which vitest does not read.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    // toSchoolAdminUrl reads this at module load, so an issue's action link needs it set here
    // rather than stubbed per test.
    env: { HOSTED_URL: 'https://platform.test' },
    reporters: [['verbose', {}]],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'e2e', '.next'],
  },
})
