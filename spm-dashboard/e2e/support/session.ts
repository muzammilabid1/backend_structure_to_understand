import { type BrowserContext, request as playwrightRequest } from '@playwright/test'
import { type JWTPayload, jwtVerify } from 'jose'
import jwt from 'jsonwebtoken'

/**
 * Session helpers shared by both e2e specs. The suite runs against a real stack, so tokens are
 * signed with the platform's own secret and refresh tokens come from a genuine login — a
 * fabricated one is refused, because refreshSession checks its jti against the session table.
 *
 * Signing uses jsonwebtoken because that is what the main platform mints tokens with (via
 * @nestjs/jwt); verifying uses jose because that is what the dashboard verifies them with (via
 * lwp-shared's tokenIsAdminToken).
 */

export const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT ?? 'http://localhost:3006/graphql'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'letmein'

// With NEXT_PUBLIC_LWP_ENV=local the cookies are named for the env; see lwp-shared/constants.
export const ACCESS_TOKEN_COOKIE = 'local_access_token'
export const REFRESH_TOKEN_COOKIE = 'local_refresh_token'

// The claims tokenIsAdminToken admits: an Auth token for an active, fully-trusted admin.
export const ADMIN_CLAIMS = {
  tokenType: 0,
  userType: 'ADMIN',
  status: 'ACTIVE',
  userTrustLevel: 2,
}

export const AN_HOUR_FROM_NOW = () => Math.floor(Date.now() / 1000) + 3600
export const A_MINUTE_AGO = () => Math.floor(Date.now() / 1000) - 60

type SignAccessTokenOptions = {
  claims?: Record<string, unknown>
  expiresAt?: number
  secret?: string
}

// lwp-shared/auth/token appends a trailing space to the configured secret, so signing and
// verification both have to use the same padded value.
const padSecret = (secret: string): string => `${secret} `

const platformSecret = (): string => process.env.LWP_JWT_SECRET ?? ''

export const signAccessToken = ({
  claims = ADMIN_CLAIMS,
  expiresAt = AN_HOUR_FROM_NOW(),
  secret = platformSecret(),
}: SignAccessTokenOptions = {}): string =>
  jwt.sign({ ...claims, exp: expiresAt }, padSecret(secret), {
    algorithm: 'HS256',
    subject: '1',
  })

export const signExpiredAdminAccessToken = (): string =>
  signAccessToken({ expiresAt: A_MINUTE_AGO() })

// Validly signed by us, but not an admin: the main platform's own sessions look like this.
export const signParentAccessToken = (): string =>
  signAccessToken({ claims: { ...ADMIN_CLAIMS, userType: 'PARENT' } })

// Correctly shaped and claiming admin, but signed with a secret that is not ours.
export const signForgedAccessToken = (): string =>
  signAccessToken({ secret: 'not-our-signing-secret' })

/**
 * Verifies a token the way the dashboard does, so a spec can assert that a token the dashboard
 * handed back is one it will accept on the next request. Rejects when the token is unverifiable.
 */
export const verifyAccessToken = async (token: string): Promise<JWTPayload> => {
  const key = new TextEncoder().encode(padSecret(platformSecret()))
  const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })

  return payload
}

const LOGIN_MUTATION = `
  mutation login($emailOrPhone: String!, $authToken: String!, $provider: AuthMethod!, $remember: Boolean) {
    login(emailOrPhone: $emailOrPhone, authToken: $authToken, provider: $provider, remember: $remember) {
      accessToken
      refreshToken
    }
  }
`

export type TokenPair = { accessToken: string; refreshToken: string }

/**
 * Logging in is rate limited to 10 a minute per IP (graphql-provider auth.module.ts:140-141) and a
 * refresh token is spent by its first use, so a session is a scarce resource here. A test that
 * spends one calls this; a test that only needs to present one calls getUnspentSession.
 */
const THROTTLE_WINDOW_MS = 62_000

const isThrottled = (reason: string): boolean => reason.includes('Too many attempts')

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const requestLogin = async (): Promise<TokenPair> => {
  const context = await playwrightRequest.newContext()
  const response = await context.post(GRAPHQL_ENDPOINT, {
    // The login mutation stores the user agent against the session and the column is NOT NULL.
    headers: { 'content-type': 'application/json', 'user-agent': 'spm-dashboard-e2e' },
    data: {
      query: LOGIN_MUTATION,
      variables: {
        emailOrPhone: ADMIN_EMAIL,
        authToken: ADMIN_PASSWORD,
        provider: 'Password',
        remember: true,
      },
    },
  })

  const body = await response.json()
  await context.dispose()

  if (body.errors?.length) {
    throw new Error(body.errors.map((e: { message: string }) => e.message).join('; '))
  }

  return body.data.login
}

/**
 * Waits the throttle window out rather than failing. Two full runs inside a minute exceed the cap
 * of 10 logins a minute per IP (graphql-provider auth.module.ts:140-141), and a suite that goes red
 * because it was run twice is worse than one that occasionally pauses. One retry only — a second
 * refusal is a real problem, not a busy window.
 */
export const logInAsAdmin = async (): Promise<TokenPair> => {
  try {
    return await requestLogin()
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    if (!isThrottled(reason)) throw new Error(`Login failed: ${reason}`)

    console.warn(`Login throttled, waiting ${THROTTLE_WINDOW_MS / 1000}s for the window to clear`)
    await wait(THROTTLE_WINDOW_MS)

    return requestLogin()
  }
}

let sharedSession: Promise<TokenPair> | null = null

/**
 * One session per worker, for tests that present a refresh token without spending it. Spending one
 * would leave every later caller holding a rotated-out token.
 */
export const getUnspentSession = (): Promise<TokenPair> => {
  if (!sharedSession) sharedSession = logInAsAdmin()

  return sharedSession
}

export const buildCookieHeader = ({ accessToken = '', refreshToken = '' }): string =>
  [`${ACCESS_TOKEN_COOKIE}=${accessToken}`, `${REFRESH_TOKEN_COOKIE}=${refreshToken}`].join('; ')

export const tamper = (token: string): string =>
  `${token.slice(0, -3)}${token.slice(-3) === 'aaa' ? 'bbb' : 'aaa'}`

type SessionCookies = { accessToken?: string; refreshToken?: string }

export const addSessionCookies = async (
  context: BrowserContext,
  { accessToken, refreshToken }: SessionCookies
): Promise<void> => {
  const cookies = [
    ...(accessToken ? [{ name: ACCESS_TOKEN_COOKIE, value: accessToken }] : []),
    ...(refreshToken ? [{ name: REFRESH_TOKEN_COOKIE, value: refreshToken }] : []),
  ]

  await context.addCookies(cookies.map((cookie) => ({ ...cookie, domain: 'localhost', path: '/' })))
}
