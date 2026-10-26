export enum InviteMode {
    // Invite is sent immediately when the user is added.
    SEND_NOW = 'SEND_NOW',
    // Invite is deferred to the autumn send window (the week before the next 1st of September).
    SEND_LATER = 'SEND_LATER',
    // No invitation is sent.
    DO_NOT_SEND = 'DO_NOT_SEND',
}
