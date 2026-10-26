/**
 * SessionLength represents the length of a session,
 * and for how long it is valid.
 *
 * The value of the enum represents the length of the session,
 * in seconds.
 *
 * @export
 * @enum
 */
export enum SessionLength {
    Instant = 0, // No refresh tokens issued
    Short = 60 * 60, // 1 hour long sessions
    Medium = 60 * 60 * 12, // 12 hour long sessions - for Google sign ins
    Long = 60 * 60 * 24 * 30 // 30 day long sessions
}
