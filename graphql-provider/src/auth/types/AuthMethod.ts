import { registerEnumType } from '@nestjs/graphql';

/**
 * AuthMethods are the allowed ways for a user to authenticate.
 *
 * @export
 * @enum
 */
export enum AuthMethod {
    Password = 'password',
    Google = 'google',
    Microsoft = 'microsoft',
    MagicLink = 'magiclink'
}

registerEnumType(AuthMethod, {
    name: 'AuthMethod'
});
