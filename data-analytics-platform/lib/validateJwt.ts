import { errors, jwtVerify, type JWTPayload } from 'jose'

import { UserType } from 'lwp-shared'

// Trailing space is intentional — it matches the graphql-provider's secret.
const JWT_SECRET = process.env.LWP_JWT_SECRET ? `${process.env.LWP_JWT_SECRET} ` : null

export interface AccessTokenPayload extends JWTPayload {
  userType: UserType
  sub: string
  exp: number
}

/**
 * Verifies an access token's signature (do NOT use jwt-decode — it skips verification).
 *
 * Returns the payload for valid tokens, and also for expired-but-validly-signed
 * tokens so the caller can refresh them. Returns null only for a missing/malformed
 * token or a bad signature.
 */
export async function validateAccessToken(token: string): Promise<AccessTokenPayload | null> {
  if (!JWT_SECRET) {
    throw new Error('LWP_JWT_SECRET environment variable is required for JWT validation')
  }

  const secret = new TextEncoder().encode(JWT_SECRET)

  try {
    const { payload } = await jwtVerify(token, secret)
    return toAccessToken(payload)
  } catch (error) {
    // jose verifies the signature before checking `exp`, so an expired error means
    // the token is genuinely ours — return its payload so it can be refreshed.
    if (error instanceof errors.JWTExpired) {
      return toAccessToken(error.payload)
    }

    return null
  }
}

function toAccessToken(payload: JWTPayload): AccessTokenPayload | null {
  const isValid = payload.sub && typeof payload.exp === 'number' && payload.userType

  return isValid ? (payload as AccessTokenPayload) : null
}
