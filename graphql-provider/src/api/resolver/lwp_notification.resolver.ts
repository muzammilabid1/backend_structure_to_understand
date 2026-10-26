import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { Pagination } from 'src/paginate';

import { LwpBuildType } from '../dtos/LwpBuildType';
import { LwpNotificationOutput } from '../dtos/LwpNotificationOutput';
import { LwpNotification } from '../entities/lwp_notification';
import { LwpNotificationEventHistory } from '../entities/lwp_notification_event_history';
import { LwpNotificationPreview, MessageLogFilterInput, MessageLogsCountOutput, UpdateNotificationStatusInputForTesting } from '../model';
import { LwpNotificationService } from '../service/lwp_notification.service';

@Resolver(() => LwpNotification)
export class LwpNotificationResolver {
    constructor(private lwpNotificationService: LwpNotificationService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async sendAllPendingNotifications(): Promise<boolean> {
        return await this.lwpNotificationService.sendAllPendingNotifications();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpNotificationOutput)
    async getNotificationHistory(
        @Args({ name: 'recipient' }) recipient: string,
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<Pagination<LwpNotification>> {
        return await this.lwpNotificationService.getNotificationHistory(recipient, limit, offset);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpNotification)
    async getNotification(@Args({ name: 'id' }) id: string): Promise<LwpNotification> {
        return await this.lwpNotificationService.getNotification(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpNotificationOutput)
    async getAllNotificationHistory(
        @Args({ name: 'limit' }) limit: number,
        @Args({ name: 'offset' }) offset: number,
        @Args({ name: 'input', type: () => MessageLogFilterInput, nullable: true }) input: MessageLogFilterInput
    ): Promise<Pagination<LwpNotification>> {
        return await this.lwpNotificationService.getAllNotificationHistory(limit, offset, input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => MessageLogsCountOutput)
    async getMessageLogsCount(
        @Args({ name: 'input', type: () => MessageLogFilterInput }) input: MessageLogFilterInput
    ): Promise<MessageLogsCountOutput> {
        return await this.lwpNotificationService.getMessageLogsCount(input);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpNotificationOutput)
    async getFailedNotificationHistory(
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<Pagination<LwpNotification>> {
        return await this.lwpNotificationService.getFailedNotificationHistory(limit, offset);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpNotificationOutput)
    async getUserNotificationHistory(
        @Args({ name: 'userId' }) userId: string,
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number
    ): Promise<Pagination<LwpNotification>> {
        return await this.lwpNotificationService.getUserNotificationHistory(userId, limit, offset);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updateNotificationStatusForTesting(
        @Args({ name: 'input', type: () => UpdateNotificationStatusInputForTesting }) input: UpdateNotificationStatusInputForTesting
    ): Promise<boolean> {
        if (process.env.LWP_ENV === LwpBuildType.LOCAL || process.env.LWP_ENV === LwpBuildType.DEV) {
            return this.lwpNotificationService.updateNotificationStatusForTesting(input);
        }

        return false;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpNotificationPreview)
    async getNotificationPreview(@Args({ name: 'notifId' }) notifId: string): Promise<LwpNotificationPreview> {
        return await this.lwpNotificationService.getNotificationPreview(notifId);
    }

    @ResolveField(() => String)
    async params(@Parent() lwpNotification: LwpNotification): Promise<string> {
        return await this.lwpNotificationService.getNotificationParams(lwpNotification?.id);
    }

    @ResolveField(() => [LwpNotificationEventHistory], { nullable: true })
    async statusHistory(@Parent() lwpNotification: LwpNotification): Promise<LwpNotificationEventHistory[]> {
        return await this.lwpNotificationService.getNotificationStatusHistory(lwpNotification?.id);
    }

    @ResolveField(() => [String], { nullable: true })
    async error(@Parent() lwpNotification: LwpNotification): Promise<string | null> {
        return await this.lwpNotificationService.getNotificationErrorMessage(lwpNotification?.id);
    }
}
