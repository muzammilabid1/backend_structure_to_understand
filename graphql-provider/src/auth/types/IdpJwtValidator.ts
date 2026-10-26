import { IdpJwtOutput } from './IdpJwtOutput';

/**
 * A JwtValidator function should take a string jwt and return either false,
 * if it’s not valid, or an {@link IdpJwtOutput} if it does.
 *
 * @export
 * @interface IdpJwtValidator
 */
export interface IdpJwtValidator {
    /**
     * Validates the {@link jwt}.
     *
     * @param {string} jwt
     * @param {string} [tenantIdentifier] some identifier for the tenant, provider-specific; optional
     * @return {Promise<false | IdpJwtOutput>}
     * @memberof IdpJwtValidator
     */
    (jwt: string, tenantIdentifier?: string): Promise<false | IdpJwtOutput>;
}
