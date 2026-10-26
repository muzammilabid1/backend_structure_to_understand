import { parse } from 'cookie'
import { tokenIsAdminToken } from 'lwp-shared/auth/token'
import { ACCESS_TOKEN_COOKIE } from 'lwp-shared/constants/index'
import type { NextApiRequest } from 'next'

/**
 * This dashboard only ever verifies tokens. It never issues or refreshes one: a caller that gets a
 * 401 signs in again on the main platform, which owns the session and renews it on the cookies
 * both apps share. So there is nothing to learn here beyond whether the request may proceed.
 */
export async function requireAdminToken(request: NextApiRequest): Promise<boolean> {
  const accessToken = parse(request.headers.cookie ?? '')[ACCESS_TOKEN_COOKIE]

  return accessToken ? tokenIsAdminToken(accessToken) : false
}
