/**
 * The regex used in LwP for validating user email addresses.
 */
export const emailRegex = `^(([^<>()[\\]\\\\.,;:\\s@"]+(\\.[^<>()[\\]\\\\.,;:\\s@"]+)*)|(\\".+\\"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$`;

/**
 * The regex used in LwP for validating user phone numbers.
 */
export const phoneRegex = `^((0|(\\+|00)44)?7\\d{9}|(\\+|00)([1-35-9]\\d|4[01-35-9])\\d{4,13})$`;