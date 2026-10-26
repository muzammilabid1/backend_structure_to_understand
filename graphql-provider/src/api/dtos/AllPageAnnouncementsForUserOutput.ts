import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { StaticLwpPageAnnouncement } from '../entities/static_lwp_page_announcement';

@ObjectType()
export class AllPageAnnouncementsForUserOutput extends StaticLwpPageAnnouncement {
    @Field(() => Boolean)
    @AuthorizeField(UnrestrictedField)
    isSeenByUser: boolean;
}
