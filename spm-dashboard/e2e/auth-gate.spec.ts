import { type APIRequestContext, type APIResponse, expect, test } from '@playwright/test'

import {
  A_MINUTE_AGO,
  ADMIN_CLAIMS,
  buildCookieHeader,
  getUnspentSession,
  signAccessToken,
  tamper,
} from './support/session'

const A_GATED_ROUTE = '/api/spm/summary'

/**
 * A page route, which carries no guard of its own — `pages/dashboard.tsx` renders a component and
 * nothing else. The API routes re-check the session themselves (`requireAdminToken`), so a refusal
 * there proves only that something refused. A page refusal can only be the middleware.
 */
const A_GATED_PAGE = '/dashboard'

// Not a JWT at all. `jwtVerify` throws on it rather than returning false, so this proves
// tokenIsAdminToken catches and fails closed instead of taking the gate down with a 500.
const A_MALFORMED_TOKEN = 'not-a-jwt-at-all'

const getPage = (request: APIRequestContext, accessToken: string): Promise<APIResponse> =>
  request.get(A_GATED_PAGE, {
    headers: { cookie: buildCookieHeader({ accessToken }) },
    maxRedirects: 0,
  })

const expectSentToTheLandingPage = (response: APIResponse): void => {
  expect(response.status()).toBe(307)
  expect(new URL(response.headers()['location'], response.url()).pathname).toBe('/')
}

test.describe('auth gate', () => {
  /**
   * The dashboard verifies a token and nothing else. It used to take a spent access token to the
   * provider's refreshSession mutation; the platform owns that now, so every column below is the
   * same column — whatever the access token is, it stands on its own.
   */
  test.describe('with no refresh token', () => {
    test('serves a request whose access token is valid', async ({ request }) => {
      const accessToken = signAccessToken()

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken }) },
      })

      expect(response.status()).toBe(200)
    })

    test('refuses an expired access token', async ({ request }) => {
      const accessToken = signAccessToken({ expiresAt: A_MINUTE_AGO() })

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken }) },
      })

      expect(response.status()).toBe(401)
    })

    test('refuses a token signed with a secret that is not ours', async ({ request }) => {
      const accessToken = signAccessToken({ secret: 'not-our-signing-secret' })

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken }) },
      })

      expect(response.status()).toBe(401)
    })

    test('refuses a tampered access token', async ({ request }) => {
      const accessToken = tamper(signAccessToken())

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken }) },
      })

      expect(response.status()).toBe(401)
    })

    test('refuses a request carrying no cookies', async ({ request }) => {
      const response = await request.get(A_GATED_ROUTE)

      expect(response.status()).toBe(401)
    })

    // A validly signed session of the main platform, which shares this cookie domain.
    test('refuses a validly signed non-admin token', async ({ request }) => {
      const accessToken = signAccessToken({
        claims: { ...ADMIN_CLAIMS, userType: 'PARENT' },
      })

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken }) },
      })

      expect(response.status()).toBe(401)
    })

    test('refuses an admin token below full trust', async ({ request }) => {
      const accessToken = signAccessToken({
        claims: { ...ADMIN_CLAIMS, userTrustLevel: 1 },
      })

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken }) },
      })

      expect(response.status()).toBe(401)
    })

    // jose throws on this rather than returning false, so it proves the verifier fails closed.
    test('refuses an access token that is not a JWT at all', async ({ request }) => {
      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken: A_MALFORMED_TOKEN }) },
      })

      expect(response.status()).toBe(401)
    })

    test('refuses a refresh token presented as an access token', async ({ request }) => {
      const { refreshToken } = await getUnspentSession()

      const response = await request.get(A_GATED_ROUTE, {
        headers: { cookie: buildCookieHeader({ accessToken: refreshToken }) },
      })

      expect(response.status()).toBe(401)
    })
  })

  /**
   * The change this suite exists for. A live refresh token used to buy a spent access token a new
   * one here; it no longer does, so the pair that once passed is now refused like any other.
   */
  test('refuses an expired access token even when the refresh token is live', async ({
    request,
  }) => {
    const { refreshToken } = await getUnspentSession()
    const accessToken = signAccessToken({ expiresAt: A_MINUTE_AGO() })

    const response = await request.get(A_GATED_ROUTE, {
      headers: { cookie: buildCookieHeader({ accessToken, refreshToken }) },
    })

    expect(response.status()).toBe(401)
  })

  // A person gets a page, not JSON: the landing page is where it says how to sign in again.
  test('sends a refused page request to the landing page', async ({ request }) => {
    const response = await request.get(A_GATED_PAGE, { maxRedirects: 0 })

    expectSentToTheLandingPage(response)
  })

  /**
   * The same deny matrix again, but against a page rather than an API route.
   *
   * This is not duplication. `pages/api/spm/*` call `requireAdminToken` for themselves, so every
   * 401 above would still be a 401 with the middleware deleted — the matrix proves that the
   * request is refused, not that this gate refused it. A page has no second layer, so it is the
   * only place the middleware can be observed alone.
   */
  test.describe('the gate on a page, which has no second layer', () => {
    // The control. Without it, a middleware that refused everything would pass every test below.
    test('serves a page to a valid admin token', async ({ request }) => {
      const response = await getPage(request, signAccessToken())

      expect(response.status()).toBe(200)
    })

    test('turns away an expired access token, even with a live refresh token', async ({
      request,
    }) => {
      const { refreshToken } = await getUnspentSession()

      const response = await request.get(A_GATED_PAGE, {
        headers: {
          cookie: buildCookieHeader({
            accessToken: signAccessToken({ expiresAt: A_MINUTE_AGO() }),
            refreshToken,
          }),
        },
        maxRedirects: 0,
      })

      expectSentToTheLandingPage(response)
    })

    // A real session of the main platform, which shares this cookie domain. It must not reach the
    // dashboard UI, and no route guard stands behind this page to stop it.
    test('turns away a validly signed non-admin token', async ({ request }) => {
      const response = await getPage(
        request,
        signAccessToken({ claims: { ...ADMIN_CLAIMS, userType: 'PARENT' } })
      )

      expectSentToTheLandingPage(response)
    })

    test('turns away a token signed with a secret that is not ours', async ({ request }) => {
      const response = await getPage(request, signAccessToken({ secret: 'not-our-signing-secret' }))

      expectSentToTheLandingPage(response)
    })

    // The 500 check: an undecodable cookie must still leave a usable gate.
    test('turns away an access token that is not a JWT at all', async ({ request }) => {
      const response = await getPage(request, A_MALFORMED_TOKEN)

      expectSentToTheLandingPage(response)
    })
  })

  /**
   * The landing page is the gate turned inside out. It is where a refused request is sent, so it
   * is served to exactly the sessions the gate refuses, and a session the gate lets through has no
   * use for it. Both directions share one check, so the two redirects cannot loop.
   */
  test.describe('the landing page, which only a refused session sees', () => {
    const getLandingPage = (request: APIRequestContext, accessToken?: string) =>
      request.get('/', {
        headers: accessToken ? { cookie: buildCookieHeader({ accessToken }) } : {},
        maxRedirects: 0,
      })

    test('is served to a request carrying no cookies', async ({ request }) => {
      const response = await getLandingPage(request)

      expect(response.status()).toBe(200)
    })

    test('is served to an expired access token', async ({ request }) => {
      const response = await getLandingPage(request, signAccessToken({ expiresAt: A_MINUTE_AGO() }))

      expect(response.status()).toBe(200)
    })

    test('is served to a validly signed non-admin token', async ({ request }) => {
      const response = await getLandingPage(
        request,
        signAccessToken({ claims: { ...ADMIN_CLAIMS, userType: 'PARENT' } })
      )

      expect(response.status()).toBe(200)
    })

    test('is served to an access token that is not a JWT at all', async ({ request }) => {
      const response = await getLandingPage(request, A_MALFORMED_TOKEN)

      expect(response.status()).toBe(200)
    })

    test('sends a valid admin token on to the dashboard', async ({ request }) => {
      const response = await getLandingPage(request, signAccessToken())

      expect(response.status()).toBe(307)
      expect(new URL(response.headers()['location'], response.url()).pathname).toBe('/dashboard')
    })
  })

  // The health route is the other exemption: the load balancer polls it carrying no session, so a
  // 401 here would take a healthy instance out of service.
  test('leaves the health route reachable without an admin token', async ({ request }) => {
    const response = await request.get('/health')

    expect(response.status()).toBe(200)
  })

  // /health is a rewrite of /api/health, and both are exempt — a gate on the target would make the
  // two answer differently depending on which one a checker was pointed at.
  test('leaves the health route reachable at the path it rewrites to', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
  })
})
