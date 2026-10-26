/**
 * An IdpJwtOutput is an ID string that is an IDP identifier that uniquely
 * identifies the user within that IDP. and a nullable email address string
 * that represents the IDP user’s email.
 *
 * @export
 * @interface IdpJwtOutput
 */
export interface IdpJwtOutput {
    /**
     * IDP-specific identifier for the user
     *
     * @type {string}
     * @memberof IdpJwtOutput
     */
    id: string;

    /**
     * Email address of the user; nullable if the IDP does not have a
     * confirmed email attached to the account.
     *
     * @type {string | null}
     * @memberof IdpJwtOutput
     */
    email?: string;

    /**
     * IDP first name; nullable if not returned from the IDP.
     *
     * @type {string | null}
     * @memberof IdpJwtOutput
     */
    firstName?: string;

    /**
     * IDP last name; nullable if not returned from the IDP.
     *
     * @type {string | null}
     * @memberof IdpJwtOutput
     */
    lastName?: string;
}
