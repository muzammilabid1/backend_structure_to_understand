import { tokenIsAdminToken } from 'lwp-shared/auth/token'
import { ACCESS_TOKEN_COOKIE } from 'lwp-shared/constants/index'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * `/health` is polled by the load balancer, which carries no session; it is listed alongside the
 * route it rewrites to so the two cannot answer differently.
 */
const UNGATED_PATHS = new Set(['/health', '/api/health'])

/**
 * The landing page exists only to tell a signed-out admin where to sign in. An admin who is
 * already signed in has no use for it, so they go straight to the dashboard.
 */
const LANDING_PATH = '/'
const DASHBOARD_PATH = '/dashboard'

const hasAdminToken = async (request: NextRequest): Promise<boolean> => {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  return accessToken ? tokenIsAdminToken(accessToken) : false
}

/**
 * An API caller wants a status it can branch on; a person wants a page. The landing page tells an
 * admin where to sign in, so a page request that fails the gate goes there.
 */
const refuseRequest = (request: NextRequest) =>
  request.nextUrl.pathname.startsWith('/api/')
    ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    : NextResponse.redirect(new URL(LANDING_PATH, request.url))

/**
 * Refuses every request that does not carry an admin token unless it is listed in
 * `UNGATED_PATHS`, so a new route is closed the moment it exists rather than when someone
 * remembers to guard it. The routes that read the database check
 * again for themselves — this gate lives in routing config, and a change to `matcher` must not be
 * able to open them.
 *
 * The landing page is the inverse of every other page: it is served only to a request that fails
 * the gate. Both redirects hang off the same check, so `/` and `/dashboard` cannot bounce a
 * request between them.
 *
 * The dashboard only ever verifies a token. It neither issues nor refreshes one: the platform owns
 * the session, so an admin whose access token has expired signs in there and comes back.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (UNGATED_PATHS.has(pathname)) return NextResponse.next()

  const isAdmin = await hasAdminToken(request)

  if (pathname === LANDING_PATH) {
    return isAdmin
      ? NextResponse.redirect(new URL(DASHBOARD_PATH, request.url))
      : NextResponse.next()
  }

  if (!isAdmin) return refuseRequest(request)

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)', '/api/(.*)'],
}
