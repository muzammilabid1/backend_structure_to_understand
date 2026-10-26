import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { UserType } from 'lwp-shared'
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './lib/manageCookies'
import { validateAccessToken } from './lib/validateJwt'

function redirectToHome(request: NextRequest) {
  return NextResponse.redirect(new URL('/', request.url))
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function clearAuthCookies(response: NextResponse) {
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN

  response.cookies.delete({
    name: ACCESS_TOKEN_COOKIE,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })
  response.cookies.delete({
    name: REFRESH_TOKEN_COOKIE,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  })

  return response
}

/**
 * Auth gate for the analytics platform (admin-only).
 *
 * Flow:
 *  - Static assets and the token-refresh endpoint always pass through.
 *  - No token:        only the homepage (the "Sign in from the main platform"
 *                     notice) is reachable; every other page/API is blocked.
 *  - Invalid token:   bad signature / malformed → clear cookies and log out.
 *  - Non-admin token: a real session, but not for this platform → no access
 *                     (cookies left intact; the session is valid elsewhere).
 *  - Expired admin:   let the request proceed so the client can refresh — API
 *                     routes get a 401 to trigger the SWR refresh flow, pages
 *                     render and let their data fetches drive the refresh.
 *                     Cookies are cleared client-side only if the refresh fails.
 *  - Valid admin:     full access.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')
  const isHomePage = pathname === '/'

  // Static assets — never gated.
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico' || pathname.includes('.')) {
    return NextResponse.next()
  }

  // The refresh endpoint must stay reachable so an expired session can recover.
  if (pathname === '/api/auth/refresh') {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  // 1. No token at all: only the homepage notice is public.
  if (!accessToken) {
    if (isHomePage) return NextResponse.next()
    if (isApiRoute) return unauthorized()
    return redirectToHome(request)
  }

  // SECURITY: verify the signature with jose (never jwt-decode). Returns a payload
  // for valid AND expired-but-validly-signed tokens; null only for a bad signature
  // or a malformed token.
  const decodedToken = await validateAccessToken(accessToken)

  // 2. Invalid / tampered / malformed token: clear cookies and log out.
  if (!decodedToken) {
    return isApiRoute ? clearAuthCookies(unauthorized()) : clearAuthCookies(redirectToHome(request))
  }

  // 3. Valid session but not an admin: no access to this platform.
  if (decodedToken.userType !== UserType.ADMIN) {
    if (isHomePage) return NextResponse.next() // homepage shows the sign-in notice
    if (isApiRoute) return unauthorized()
    return redirectToHome(request)
  }

  const isTokenExpired =
    typeof decodedToken.exp === 'number' && decodedToken.exp * 1000 <= Date.now()

  // 4. Expired admin token: allow the client to refresh.
  if (isTokenExpired) {
    return isApiRoute ? unauthorized() : NextResponse.next()
  }

  // 5. Valid, current admin token: full access.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)', '/api/(.*)'],
}
