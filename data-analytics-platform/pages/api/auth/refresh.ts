import { parse } from 'cookie'
import type { NextApiRequest, NextApiResponse } from 'next'

import { refreshSessionWithGraphqlProvider } from '../../../lib/graphql-auth-client'
import { REFRESH_TOKEN_COOKIE } from '@/lib/manageCookies'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cookies = parse(req.headers.cookie ?? '')
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE]

  if (!refreshToken) {
    return res.status(401).json({ error: 'Missing refresh token' })
  }

  try {
    const result = await refreshSessionWithGraphqlProvider(refreshToken)

    return res
      .status(200)
      .json({ ok: true, accessToken: result.accessToken, refreshToken: result.refreshToken })
  } catch (error) {
    return res
      .status(401)
      .json({ error: error instanceof Error ? error.message : 'Session refresh failed' })
  }
}
