import { Field, ObjectType } from '@nestjs/graphql';

import { LwpNotification } from '../entities/lwp_notification';
import { WithPagination } from './WithPagination';

@ObjectType()
export class LwpNotificationOutput extends WithPagination {
    @Field(() => [LwpNotification])
    results: LwpNotification[];
}
