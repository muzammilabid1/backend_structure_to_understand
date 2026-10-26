import { Field, ObjectType } from '@nestjs/graphql';

import { AuthorizeField, UnrestrictedField } from '../auth.field.decorators';
import { AuthMethod } from './AuthMethod';
import { PreLoginStatus } from './PreLoginStatus';

/**
 * A PreLoginResponse is sent to the client to determine the next phase
 * of login following the submission of an identifier of a user.
 *
 * @export
 * @class PreLoginResponse
 */
@ObjectType()
export class PreLoginResponse {
    /**
     * The email or phone number the response is for.
     *
     * @type {string}
     * @memberof PreLoginResponse
     */
    @Field()
    @AuthorizeField(UnrestrictedField)
    emailOrPhone: string;

    /**
     * Indicates whether a login attempt should be made at all, or whether
     * another user page is more appropriate.
     *
     * @type {PreLoginStatus}
     * @memberof PreLoginResponse
     */
    @Field()
    @AuthorizeField(UnrestrictedField)
    status: PreLoginStatus;

    /**
     * Which authentication methods should be allowed.
     * Magic links aren't included here as they are a different login path.
     *
     * @type {Omit<AuthMethod, 'MagicLink'>[]}
     * @memberof PreLoginResponse
     */
    @Field(() => [AuthMethod], { nullable: true })
    @AuthorizeField(UnrestrictedField)
    methods?: Omit<AuthMethod, 'MagicLink'>[];

    /**
     * Set on Invited-state users to display options for
     * resending invitations.
     *
     * @type {Boolean}
     * @memberof PreLoginResponse
     */
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    canSendEmail?: boolean;

    /**
     * Set on Invited-state users to display options for
     * resending invitations.
     *
     * @type {Boolean}
     * @memberof PreLoginResponse
     */
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    canSendSms?: boolean;
}
