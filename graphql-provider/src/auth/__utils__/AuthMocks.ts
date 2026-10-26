import { AuthToken, AuthTokenJWT } from 'src/auth/types/AuthToken';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';

import { TokenType } from '../types/TokenType';

export function mockJwtAuthToken(
    sub: string | number,
    data: Partial<Omit<AuthToken, 'tokenType' | 'toPayload' | 'userTrustLevel'>>,
    trustLevel = UserTrustLevel.Full,
    exp = new Date().getTime() / 1000 + 60
): AuthTokenJWT {
    return {
        sub: sub.toString(),
        exp,
        tokenType: TokenType.Auth,
        ...new AuthToken(data).trustAs(trustLevel)
    };
}
