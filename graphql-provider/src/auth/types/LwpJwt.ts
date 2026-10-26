import { JwtPayload } from 'jsonwebtoken';

import { TokenType } from './TokenType';

type JWT_REQUIRED_PROPERTIES = {
    sub: string;
    exp: number;
};

export type JwtPayloadWithRequiredProps = Omit<
    {
        [K in keyof JwtPayload as string extends K ? never : K]: JwtPayload[K];
    },
    keyof JWT_REQUIRED_PROPERTIES
> &
    JWT_REQUIRED_PROPERTIES;

export type LwpJwtConstructor<T> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (...args: any[]): T;
    readonly tokenType: TokenType;
};

/**
 * An LwpJwt is the base data for a JWT issued by the auth system to a user.
 *
 * @export
 * @abstract
 * @class LwpJwt
 */
export abstract class LwpJwt {
    /**
     * The type of the token.
     *
     * @type {TokenType}
     * @abstract
     * @memberof LwpJwt
     */
    readonly tokenType: TokenType;

    /**
     * Converts the LwpJwt's data to a jwt payload.
     * This reflects the tokenType into the jwt, so we can ensure
     * we keep access to the metadata about what type of token this
     * is after the payload is JSON serialized and deserialized.
     *
     * This method is also a practical requirement of jsonwebtoken,
     * which doesn't like serializing non-POJOs!
     *
     * @return {Omit<this, 'toPayload'>} the payload data
     * @memberof LwpJwt
     */
    toPayload(): Omit<this, 'toPayload'> {
        const { ...data } = this;

        return { tokenType: Object.getPrototypeOf(this).constructor.tokenType, ...data };
    }
}
