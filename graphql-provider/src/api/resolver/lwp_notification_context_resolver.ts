import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { LwpNotificationContext } from '../model';

@Resolver(() => LwpNotificationContext)
export class LwpNotificationContextResolver {
    @ResolveField()
    mailData(@Parent() context: LwpNotificationContext): string {
        return JSON.stringify(context.mailData);
    }
}
