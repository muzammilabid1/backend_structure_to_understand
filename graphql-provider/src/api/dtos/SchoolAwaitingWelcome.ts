import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField } from 'src/auth/auth.field.decorators';

/**
 * A school with leaders still owed the welcome email, and how many of them there are. One row per school in the
 * admin "Send welcome emails" modal, where selection is per school; the leaders themselves are only fetched, via
 * `getSchoolLeadersAwaitingWelcome`, when a row is expanded.
 */
@ObjectType()
export class SchoolAwaitingWelcome {
    @AuthorizeField(AdminField)
    @Field()
    schoolId: string;

    @AuthorizeField(AdminField)
    @Field()
    schoolName: string;

    @AuthorizeField(AdminField)
    @Field(() => Int)
    leaderCount: number;
}
