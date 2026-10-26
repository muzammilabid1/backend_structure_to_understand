import { jwtVerify } from 'jose';

/**
 * tokenIsAdminToken returns true when a token passed into it is a non-expired
 * admin auth token. It is authorisation-only, not authentication: it returns no
 * guarantees about *who* the administrative user is, nor does it validate
 * the user beyond the validity of the token. Use with caution.
 *
 * @param token a JWT token as a string
 * @returns true if the token is a fully-trusted administrative user's auth token; false otherwise
 */
export const tokenIsAdminToken: (token: string) => Promise<boolean> = async (
    token,
) => {
    const JWT_SECRET = process.env.LWP_JWT_SECRET
        ? `${process.env.LWP_JWT_SECRET} ` /* N.B. the trailing space is intentional and required */
        : undefined;
    if (!JWT_SECRET) return false;

    try {
        // jose verifies exp is either non-existent or in the future
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(JWT_SECRET),
            { algorithms: ['HS256'] },
        );

        if (
            payload.exp && // the token must *have* an expiry time
            payload.tokenType === 0 && // the token type is 'Auth', not 'Refresh' or 'FileUpload'
            payload.userType === 'ADMIN' &&
            payload.status === 'ACTIVE' &&
            payload.userTrustLevel === 2 // the user is trusted FULLY only
        )
            return true;

        return false;
    } catch {
        // this will incorporate e.g. TokenExpiredErrors, but we also just want this to fail closed
        return false;
    }
};
