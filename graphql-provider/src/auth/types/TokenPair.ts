import { Field, ObjectType } from '@nestjs/graphql';

import { AuthorizeField, UnrestrictedField } from '../auth.field.decorators';

/**
 * A TokenPair is an access token and a refresh token,
 * ready for use by a client.
 *
 * @export
 * @class TokenPair
 */
@ObjectType()
export class TokenPair {
    /**
     * An access token for immediate site access.
     *
     * @type {string}
     * @memberof TokenPair
     */
    @Field()
    @AuthorizeField(UnrestrictedField)
    accessToken: string;

    /**
     * A refresh token to revalidate access.
     * Not set where the session is INSTANT.
     *
     * @type {string | undefined}
     * @memberof TokenPair
     */
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    refreshToken?: string;
}
