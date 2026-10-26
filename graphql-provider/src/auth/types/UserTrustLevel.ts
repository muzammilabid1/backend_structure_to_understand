/**
 * UserTrustLevel represents how much we trust that the user is, in fact,
 * the user that they claim to be based on their current token's data.
 *
 * @export
 * @enum {number}
 */
export enum UserTrustLevel {
    /**
     * AsFarAsWeCanThrowThem trust is assumed to be a totally untrusted user.
     * This is not currently used, but serves to reserve the `0` trust enum
     * value for future use.
     */
    AsFarAsWeCanThrowThem = 0,
    /**
     * Limited trust applies to users who are using magic links, and are not
     * authenticated by any other means. This is because some of these links
     * are long-lived.
     */
    Limited = 1,
    /**
     * Full trust applies to users who are using other means of authentication.
     * It may also be applied to the shortest-lived single-use magic links under
     * some circumstances.
     */
    Full = 2
}
