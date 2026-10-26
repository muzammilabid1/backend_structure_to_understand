export const assertPhoneNumberIsE164 = (phoneNumber: string | null | undefined): void | never => {
    if (!phoneNumber?.startsWith('+')) {
        throw new InvalidSmsRecipientError('Phone number must be in E.164 format');
    }
};

export class InvalidSmsRecipientError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidSmsRecipientError';
        Object.setPrototypeOf(this, InvalidSmsRecipientError.prototype);
    }
}
