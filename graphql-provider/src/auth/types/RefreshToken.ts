import { JwtPayloadWithRequiredProps, LwpJwt } from './LwpJwt';
import { TokenType } from './TokenType';

/**
 * RefreshTokens are the token used for refreshing auth tokens in the app.
 *
 * @export
 * @class RefreshToken
 * @implements {LwpJwt}
 */
export class RefreshToken extends LwpJwt {
    static readonly tokenType = TokenType.Refresh;
}

export type RefreshTokenJWT = RefreshToken & JwtPayloadWithRequiredProps;
