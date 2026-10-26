import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

// The unread count is worked out in the browser per page (see the Announcements component), so it is not here.
@ObjectType()
export class UserAnnouncementContextOutput {
    @Field()
    @AuthorizeField(UnrestrictedField)
    hasAnnouncements: boolean;
}
