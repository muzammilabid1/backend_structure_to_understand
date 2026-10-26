/**
 * PreLoginStatus represents an instruction to the client of
 * whether the user is permitted to attempt a login with the
 * given identifier.
 *
 * @export
 * @enum
 */
export enum PreLoginStatus {
    OK = 'OK',
    Invited = 'Invited',
    Imported = 'Imported',
    NoSuchUser = 'NoSuchUser'
}
