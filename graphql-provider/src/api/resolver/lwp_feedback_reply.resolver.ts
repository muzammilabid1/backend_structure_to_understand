import { HttpException } from '@nestjs/common';
import { Args, Mutation, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FeedbackReplyType } from 'lwp-shared';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';

import { LwpFeedbackReply } from '../entities/lwp_feedback_reply';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSticker } from '../entities/lwp_sticker';
import { LwpUser } from '../entities/user';
import { CreateFeedbackReplyInput, ErrorStatusCodeEnum, UpdateFeedbackReplyInput } from '../model';
import { LwpFeedbackReplyService } from '../service/lwp_feedback_reply.service';

@Resolver(() => LwpFeedbackReply)
export class LwpFeedbackReplyResolver {
    constructor(private feedbackRepliesService: LwpFeedbackReplyService) {}

    @AuthorizeEndpoint(
        [LwpPupilFeedback, OpType.Read, 'input.feedbackId'],
        [LwpFeedbackReply, OpType.Write, null, { parentId: 'input.feedbackId' }]
    )
    @Mutation(() => LwpFeedbackReply)
    async createFeedbackReply(
        @Args({ name: 'input', type: () => CreateFeedbackReplyInput }) input: CreateFeedbackReplyInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpFeedbackReply> {
        if (!input.reply && !input.stickerId)
            throw new HttpException('Either reply or stickerId must be provided', ErrorStatusCodeEnum._535);

        return await this.feedbackRepliesService.createFeedbackReply(input, userId);
    }

    @AuthorizeEndpoint([LwpFeedbackReply, OpType.Write, 'input.id'])
    @Mutation(() => LwpFeedbackReply)
    async updateFeedBackReply(
        @Args({ name: 'input', type: () => UpdateFeedbackReplyInput }) input: UpdateFeedbackReplyInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpFeedbackReply> {
        if (!input.reply && !input.stickerId)
            throw new HttpException('Either reply or stickerId must be provided', ErrorStatusCodeEnum._535);

        return await this.feedbackRepliesService.updateFeedbackReply(input, userId);
    }

    @AuthorizeEndpoint([LwpFeedbackReply, OpType.Write, 'id'])
    @Mutation(() => LwpFeedbackReply)
    async removeFeedbackReply(@Args('id') id: string, @AuthInfo('sub') sub: string): Promise<LwpFeedbackReply> {
        return await this.feedbackRepliesService.removeFeedbackReply(id, sub);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async sendParentNotificationOfTeacherFeedbackReply(): Promise<boolean> {
        return await this.feedbackRepliesService.sendParentNotificationOfTeacherFeedbackReply();
    }

    @ResolveField(() => LwpUser)
    async logCreatedBy(@Parent() feedbackReply: LwpFeedbackReply): Promise<LwpUser> {
        return await this.feedbackRepliesService.getLogCreatedBy(feedbackReply?.id);
    }

    @ResolveField(() => LwpSticker, { nullable: true })
    async sticker(@Parent() feedbackReply: LwpFeedbackReply): Promise<LwpSticker | null> {
        /**
         * If the feedback reply type is `STICKER` and `originalFeedbackReplyId` is null, then return the sticker
         */
        if (feedbackReply.type === FeedbackReplyType.STICKER && !feedbackReply?.originalFeedbackReplyId) {
            return this.feedbackRepliesService.getSticker(feedbackReply?.id);
        }

        return null;
    }
}
