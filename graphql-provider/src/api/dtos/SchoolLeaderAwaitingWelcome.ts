import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField } from 'src/auth/auth.field.decorators';

/**
 * A school leader of an active school who has never been sent the welcome email - on the platform, invited, or
 * imported with their invitation held back for the autumn. Rows for the admin "Send welcome emails" modal on the
 * schools list, listed under their school when the admin expands it.
 */
@ObjectType()
export class SchoolLeaderAwaitingWelcome {
    @AuthorizeField(AdminField)
    @Field()
    userId: string;

    @AuthorizeField(AdminField)
    @Field()
    firstname: string;

    @AuthorizeField(AdminField)
    @Field()
    lastname: string;

    @AuthorizeField(AdminField)
    @Field()
    email: string;
}
