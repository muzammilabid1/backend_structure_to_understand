/**
 * TokenTypes are the different types of JWT issued by the system.
 *
 * @export
 * @enum
 */
export enum TokenType {
    /**
     * Auth tokens are used as the primary access token of the app.
     */
    Auth,
    /**
     * Refresh tokens are used to refresh sessions when an auth token expires.
     */
    Refresh,
    /**
     * FileUpload tokens are tokens that are issued to represent the name of a file
     * which the client is expected to upload directly. These are used to avoid scenarios
     * where a user could attach someone else's file to their own records.
     */
    FileUpload
}
