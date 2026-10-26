import { UserStatus } from 'lwp-shared';
import { AdminRestrictions } from 'src/api/model';
import { UserType } from 'src/auth/types/UserType';

import { JwtPayloadWithRequiredProps, LwpJwt } from './LwpJwt';
import { TokenType } from './TokenType';
import { UserTrustLevel } from './UserTrustLevel';

/**
 * AuthTokens are the token used for authentication in the app.
 *
 * @export
 * @class AuthToken
 * @implements {LwpJwt}
 */
export class AuthToken extends LwpJwt {
    static readonly tokenType = TokenType.Auth;

    /**
     * Creates an instance of AuthToken.
     * @param {Partial<AuthToken>} data the data to put in the token
     * @memberof AuthToken
     */
    constructor(data: Partial<Omit<AuthToken, 'tokenType' | 'toPayload' | 'userTrustLevel'>>) {
        super();
        Object.assign(this, data);
    }

    /**
     * The user's first name.
     *
     * @type {string}
     * @memberof LwpJwt
     */
    firstName: string;

    /**
     * The user's last name.
     *
     * @type {string}
     * @memberof LwpJwt
     */
    lastName: string;

    /**
     * The user's email, if they have one.
     *
     * @type {string}
     * @memberof AuthToken
     */
    email?: string;

    /**
     * The user's phone number, if they have one.
     *
     * @type {string}
     * @memberof AuthToken
     */
    phoneNumber?: string;

    /**
     * The type of the user.
     *
     * @type {UserType}
     * @memberof LwpJwt
     */
    userType: UserType;

    /**
     * How confident we are that this user is
     * who they say they are.
     *
     * @type {UserTrustLevel}
     * @memberof AuthToken
     */
    userTrustLevel: UserTrustLevel;

    /**
     * The status of the user.
     *
     * @type {UserStatus}
     * @memberof LwpJwt
     */
    status: UserStatus;

    /**
     * Any admin restrictions the user has.
     *
     * @type {AdminRestrictions | null}
     * @memberof LwpJwt
     */
    adminRestrictions?: AdminRestrictions;

    /**
     * A list of bigint string IDs of pupils for a parent, or null if none.
     *
     * @type {string[] | null}
     * @memberof LwpJwt
     */
    pupilIds?: string[];

    /**
     * The ID of the school for a teacher, or null if none.
     *
     * @type {string | null}
     * @memberof LwpJwt
     */
    schoolId?: string;

    /**
     * The name of the school for a teacher, or null if none.
     *
     * @type {string | null}
     * @memberof AuthToken
     */
    schoolName?: string;

    /**
     * A list of bigint string IDs of classes for a non-school leader teacher,
     * or null if none.
     *
     * @type {string[] | null}
     * @memberof LwpJwt
     */
    classIds?: string[];

    /**
     * True if the user is a school leader, or false otherwise.
     *
     * @type {boolean | null}
     * @memberof LwpJwt
     */
    isSchoolLeader?: boolean;

    /**
     * trustAs allows the caller to imbue the AuthToken with a
     * specific {@link UserTrustLevel} prior to converting it
     * to a payload. This is essentially a helper method for
     * chaining.
     *
     * @param {UserTrustLevel} trustLevel the trust level with which to imbue the token
     * @return {AuthToken} the token
     * @memberof AuthToken
     */
    trustAs(trustLevel: UserTrustLevel): AuthToken {
        this.userTrustLevel = trustLevel;

        return this;
    }
}

export type AuthTokenJWT = Omit<AuthToken, 'trustAs' | 'toPayload'> & JwtPayloadWithRequiredProps;
