import type { FullConfig } from '@playwright/test'

import { GRAPHQL_ENDPOINT } from './session'

/**
 * The suite runs against a real stack rather than a server Playwright owns, so a missing secret or
 * a stack that is down would otherwise surface as dozens of assertion failures. Fail once here,
 * saying what is missing and how to supply it.
 */

const HOW_TO_RUN = 'yarn test:e2e'

const isReachable = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { method: 'HEAD' })

    return true
  } catch {
    return false
  }
}

const findBaseUrl = (config: FullConfig): string => {
  const [project] = config.projects

  return project?.use?.baseURL ?? 'http://localhost:3002'
}

export default async function checkPreconditions(config: FullConfig): Promise<void> {
  const baseUrl = findBaseUrl(config)
  const problems: string[] = []

  if (!process.env.LWP_JWT_SECRET) {
    problems.push(
      `LWP_JWT_SECRET is not set. The suite signs tokens the running dashboard must verify, so it needs the platform's own secret: ${HOW_TO_RUN}`
    )
  }

  if (!(await isReachable(baseUrl))) {
    problems.push(
      `No dashboard answering at ${baseUrl}. Start it with: yarn run spm-dashboard:dev`
    )
  }

  if (!(await isReachable(GRAPHQL_ENDPOINT))) {
    problems.push(
      `No graphql provider answering at ${GRAPHQL_ENDPOINT}. Start the platform from the monorepo root with: yarn run dev`
    )
  }

  if (problems.length) {
    throw new Error(`Cannot run the spm-dashboard e2e suite:\n\n  - ${problems.join('\n  - ')}\n`)
  }
}
