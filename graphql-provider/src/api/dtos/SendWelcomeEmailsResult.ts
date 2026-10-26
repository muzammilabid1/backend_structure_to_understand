import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField } from 'src/auth/auth.field.decorators';

/** Why a requested welcome email could not be queued, so the admin sees who missed out and why. */
@ObjectType()
export class WelcomeEmailFailure {
    @AuthorizeField(AdminField)
    @Field()
    userId: string;

    /** Best-effort name for display; falls back to the id when the user could not be loaded at all. */
    @AuthorizeField(AdminField)
    @Field()
    name: string;

    @AuthorizeField(AdminField)
    @Field()
    reason: string;
}

/**
 * Outcome of a bulk welcome-email send. `sentCount` is how many were queued for delivery - the notification
 * pipeline does the actual sending - so a success here means "accepted", not "landed in the inbox".
 */
@ObjectType()
export class SendWelcomeEmailsResult {
    @AuthorizeField(AdminField)
    @Field(() => Int)
    sentCount: number;

    @AuthorizeField(AdminField)
    @Field(() => [WelcomeEmailFailure])
    failures: WelcomeEmailFailure[];
}
