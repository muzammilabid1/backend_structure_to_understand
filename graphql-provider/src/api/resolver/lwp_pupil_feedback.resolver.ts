import { HttpException } from '@nestjs/common';
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Loader } from 'nestjs-dataloader';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { Pagination } from 'src/paginate';
import { BaseEntity } from 'typeorm';

import { PupilFeedbackOutput } from '../dtos/PupilFeedbackOutput';
import { PupilReadingLogsOutput } from '../dtos/PupilReadingLogOutput';
import { PupilReadingTopicOutput } from '../dtos/PupilReadingTopicOutput';
import { LwpFeedbackReply } from '../entities/lwp_feedback_reply';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpPupilFeedbackMedia } from '../entities/lwp_pupil_feedback_media';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchool } from '../entities/school';
import { LwpSchoolClass } from '../entities/school_class';
import { LwpUser } from '../entities/user';
import { LwpPupilFeedbackLastActionLoader, LwpPupilFeedbackSchoolLoader } from '../loader/lwp_pupil_feedback.loader';
import {
    AddReadingLogAsGroupInput,
    AddReadingLogInput,
    ErrorStatusCodeEnum,
    FeedbackType,
    LastPupilHistoryOutput,
    LikePupilActivityFeedbackInput,
    OperationStatus,
    PupilActivityFeedbackInput,
    PupilActivityFeedsFilterInput,
    PupilHistoryOutput,
    PupilOwnActivityFeedbackInput,
    UpdateReadingLogAsGroupInput,
    UpdateReadingLogInput
} from '../model';
import { HelperService } from '../service/helper.service';
import { LwpFeedbackReplyService } from '../service/lwp_feedback_reply.service';
import { LwpPupilFeedbackService } from '../service/lwp_pupil_feedback.service';

@Resolver(() => LwpPupilFeedback)
export class LwpPupilFeedbackResolver {
    constructor(
        private pupilFeedbackService: LwpPupilFeedbackService,
        private helperService: HelperService,
        private feedbackRepliesService: LwpFeedbackReplyService
    ) {}

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, null, { parentId: 'input.pupilId' }])
    @Mutation(() => LwpPupilFeedback)
    async savePupilActivityFeedback(
        @Args({ name: 'input' }) input: PupilActivityFeedbackInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo() authInfo: AuthTokenJWT,
        @Context() context
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.savePupilActivityFeedback(
            input,
            file,
            authInfo.sub,
            authInfo.userType,
            this.helperService.extractDeviceTypeFromContext(context)
        );
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, null, { parentId: 'input.pupilId' }])
    @Mutation(() => LwpPupilFeedback)
    async addReadingLog(
        @Args({ name: 'input', type: () => AddReadingLogInput }) input: AddReadingLogInput,
        @AuthInfo() authInfo: AuthTokenJWT,
        @Context() context
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.addReadingLog(
            input,
            authInfo.sub,
            authInfo.userType,
            authInfo.firstName,
            authInfo.lastName,
            this.helperService.extractDeviceTypeFromContext(context)
        );
    }

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpPupilFeedback, OpType.Write, null, { parentId: 'input.pupilIds' }],
        [LwpSchool, OpType.Read, 'input.schoolId']
    )
    @Mutation(() => LwpPupilFeedback)
    async addReadingLogAsGroup(
        @Args({ name: 'input', type: () => AddReadingLogAsGroupInput }) input: AddReadingLogAsGroupInput,
        @AuthInfo() authInfo: AuthTokenJWT,
        @Context() context
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.addReadingLogAsGroup(
            input,
            authInfo.sub,
            authInfo.userType,
            authInfo.firstName,
            authInfo.lastName,
            this.helperService.extractDeviceTypeFromContext(context)
        );
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilFeedback, OpType.Write, 'input.id', { parentId: 'input.pupilIds' }])
    @Mutation(() => LwpPupilFeedback)
    async updateReadingLogAsGroup(
        @Args({ name: 'input', type: () => UpdateReadingLogAsGroupInput }) input: UpdateReadingLogAsGroupInput,
        @AuthInfo('sub') userId: string,
        @Context() context
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.updateReadingLogAsGroup(
            input,
            userId,
            this.helperService.extractDeviceTypeFromContext(context)
        );
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, 'input.id', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpPupilFeedback)
    async updateReadingLog(
        @Args({ name: 'input', type: () => UpdateReadingLogInput }) input: UpdateReadingLogInput,
        @AuthInfo('sub') userId: string,
        @AuthInfo('userType') userType: UserType,
        @Context() context
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.updateReadingLog(
            input,
            userId,
            userType,
            this.helperService.extractDeviceTypeFromContext(context)
        );
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => PupilReadingLogsOutput)
    async allPupilReadingLogs(
        @Args({ name: 'pupilId' }) pupilId: string,
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<Pagination<LwpPupilFeedback>> {
        return await this.pupilFeedbackService.allPupilReadingLogs(
            pupilId,
            limit,
            offset,
            authInfo.sub,
            authInfo.userType,
            authInfo.userTrustLevel
        );
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [LwpPupilFeedback])
    async getPupilReadingLogsForTheDay(
        @Args({ name: 'pupilId' }) pupilId: string,
        @Args('date') date: Date,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getPupilReadingLogsForTheDay(
            pupilId,
            date,
            authInfo.sub,
            authInfo.userType,
            authInfo.userTrustLevel
        );
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => PupilReadingTopicOutput)
    async getPupilReadingTopic(
        @Args({ name: 'pupilId' }) pupilId: string,
        @Args({ name: 'topicId' }) topicId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<PupilReadingTopicOutput> {
        /*
         * The feedback service uses the pupil ID to find all topics for the pupil but then only returns any data if
         * there is a pupil topic matching this topic ID within the data. Either pupil ID or pupil topic ID could be
         * used for validation based on the current logic; pupil topic ID is more futureproof.
         */
        return await this.pupilFeedbackService.getPupilReadingTopic(pupilId, topicId, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilFeedback, OpType.Read, 'feedbackId'])
    @Query(() => [LwpSchoolClass], { nullable: true })
    async getFeedbackPupilsClasses(@Args('feedbackId') feedbackId: string): Promise<LwpSchoolClass[]> {
        return await this.pupilFeedbackService.getFeedbackPupilsClasses(feedbackId);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [LwpPupilTopic])
    async getReadingTopics(@Args({ name: 'pupilId' }) pupilId: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilTopic[]> {
        return await this.pupilFeedbackService.getReadingTopics(pupilId, authInfo.sub, authInfo.userType);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [LwpPupilFeedback])
    async getPupilHistory(@Args('pupilId') pupilId: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getPupilHistory(pupilId, authInfo.sub, authInfo.userType, authInfo.userTrustLevel);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => Boolean)
    async pupilHaveHistory(@Args('pupilId') pupilId: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.pupilFeedbackService.pupilHaveHistory(pupilId, userId);
    }

    @AuthorizeEndpoint([LwpPupilActivity, OpType.Read, 'pupilActivityId'])
    @Query(() => [LwpPupilFeedback])
    async getPupilFeedbacksOfPupilActivity(@Args({ name: 'pupilActivityId' }) pupilActivityId: string): Promise<LwpPupilFeedback[]> {
        return await this.pupilFeedbackService.getPupilFeedbacksOfPupilActivity(pupilActivityId);
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteReadingLog(@Args({ name: 'id' }) id: string): Promise<OperationStatus> {
        return await this.pupilFeedbackService.deleteReadingLog(id);
    }

    @AuthorizeEndpoint([LwpUser, OpType.Read, 'teacherId'], [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => PupilFeedbackOutput)
    async getPupilActivityFeeds(
        @Args({ name: 'teacherId', nullable: true }) teacherId: string,
        @Args({ name: 'schoolId' }) schoolId: string,
        @Args({ name: 'limit', nullable: true }) limit: number,
        @Args({ name: 'offset', nullable: true }) offset: number,
        @Args({ name: 'filter', nullable: true }) filter: PupilActivityFeedsFilterInput,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<Pagination<LwpPupilFeedback>> {
        // The function called here only returns the feed data relevant to the user specified in the arguments.
        return await this.pupilFeedbackService.getPupilActivityFeeds(
            teacherId,
            authInfo.sub,
            authInfo.userType,
            authInfo.isSchoolLeader,
            schoolId,
            limit,
            offset,
            filter
        );
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Read, 'feedbackId'])
    @Query(() => LwpPupilFeedback)
    async getFeedBackById(@Args({ name: 'feedbackId' }) feedbackId: string): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.getFeedBackById(feedbackId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Read, 'pupilId'], [LwpPupilTopic, OpType.Read, 'pupilTopicId'])
    @Query(() => [LwpPupilFeedback])
    async getPupilFeedbackByPupilTopicId(
        @Args('pupilTopicId') pupilTopicId: string,
        @Args('pupilId') pupilId: string,
        @Args({ name: 'type', type: () => FeedbackType }) type: FeedbackType
    ): Promise<LwpPupilFeedback[]> {
        return this.pupilFeedbackService.getPupilFeedbackByPupilTopicId(pupilTopicId, pupilId, type);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilTopic, OpType.Read, 'pupilTopicId'])
    @Query(() => [LwpPupilFeedback])
    async getPupilFeedbacksByTopicIdAndbookReadAt(
        @Args('pupilTopicId') pupilTopicId: string,
        @Args('bookReadAt') bookReadAt: Date
    ): Promise<LwpPupilFeedback[]> {
        return this.pupilFeedbackService.getPupilFeedbacksByTopicIdAndbookReadAt(pupilTopicId, bookReadAt);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilFeedback, OpType.Write, 'input.feedId'])
    @Mutation(() => LwpPupilFeedback)
    async likePupilActivityFeedback(@Args({ name: 'input' }) input: LikePupilActivityFeedbackInput): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.likePupilActivityFeedback(input);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Write, 'input.pupilId', { requiredTrust: UserTrustLevel.Full }])
    @Mutation(() => LwpPupilFeedback)
    async saveOwnPupilActivityFeedback(
        @Args({ name: 'input' }) input: PupilOwnActivityFeedbackInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.saveOwnPupilActivityFeedback(input, file, userId);
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Write, 'id'])
    @Mutation(() => LwpPupilFeedback)
    async deleteFeedback(
        @Args({ name: 'id' }) id: string,
        @Args({ name: 'reasonToDelete', nullable: true }) reasonToDelete: string,
        @AuthInfo('sub') userId: string
    ): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.deleteFeedback(id, reasonToDelete, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpPupilFeedback)
    async savePupilFeedbackRating(@Args({ name: 'id' }) id: string, @Args({ name: 'rating' }) rating: number): Promise<LwpPupilFeedback> {
        return await this.pupilFeedbackService.savePupilFeedbackRating(id, rating);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async sendParentNotificationOfTeacherReadingComment(): Promise<boolean> {
        return await this.pupilFeedbackService.sendParentNotificationOfTeacherReadingComment();
    }

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpSchool, OpType.Read, 'schoolId'],
        [LwpPupil, OpType.Read, 'pupilId', { optional: true }],
        [LwpUser, OpType.Read, 'teacherId', { optional: true }]
    )
    @Query(() => Boolean)
    async haveUnTickedFeedbacks(
        @Args({ name: 'pupilId', nullable: true }) pupilId: string,
        @Args({ name: 'teacherId', nullable: true }) teacherId: string,
        @Args({ name: 'schoolId' }) schoolId: string,
        @Args({ name: 'filter', nullable: true }) filter: PupilActivityFeedsFilterInput,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<boolean> {
        if (!pupilId && !teacherId) throw new HttpException('Either pupilId or teacherId must be provided', ErrorStatusCodeEnum._535);

        return await this.pupilFeedbackService.haveUnTickedFeedbacks(
            pupilId,
            teacherId,
            filter,
            authInfo.sub,
            authInfo.userType,
            authInfo.isSchoolLeader,
            schoolId
        );
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilFeedback, OpType.Write, 'feedbackId'], [LwpSchool, OpType.Read, 'schoolId'])
    @Mutation(() => Boolean)
    async markFeedbacksAsTicked(
        @Args('feedbackId') feedbackId: string,
        @Args('schoolId') schoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        await this.pupilFeedbackService.markFeedbacksAsTicked(feedbackId, userId);

        return true;
    }

    @AuthorizeEndpoint(
        TeacherOnly,
        [LwpSchool, OpType.Read, 'schoolId'],
        [LwpPupil, OpType.Read, 'pupilId', { optional: true }],
        [LwpUser, OpType.Read, 'teacherId', { optional: true }]
    )
    @Mutation(() => Boolean)
    async markAllFeedbacksAsTicked(
        @Args({ name: 'pupilId', nullable: true }) pupilId: string,
        @Args({ name: 'teacherId', nullable: true }) teacherId: string,
        @Args({ name: 'schoolId' }) schoolId: string,
        @Args({ name: 'filter', nullable: true }) filter: PupilActivityFeedsFilterInput,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<boolean> {
        if (!pupilId && !teacherId) throw new HttpException('Either pupilId or teacherId must be provided', ErrorStatusCodeEnum._535);

        return await this.pupilFeedbackService.markAllFeedbacksAsTicked(
            pupilId,
            teacherId,
            filter,
            authInfo.sub,
            authInfo.userType,
            authInfo.isSchoolLeader,
            schoolId
        );
    }

    @AuthorizeEndpoint([LwpPupilFeedback, OpType.Read, 'feedbackId'])
    @Query(() => [PupilHistoryOutput], { nullable: true })
    async getPupilFeedbackHistoryLogs(@Args('feedbackId') feedbackId: string): Promise<PupilHistoryOutput[]> {
        return await this.pupilFeedbackService.getHistoryOfFeedback(feedbackId);
    }

    @ResolveField(() => LwpPupilFeedbackMedia)
    async photos(@Parent() feedback: LwpPupilFeedback): Promise<Omit<LwpPupilFeedbackMedia, keyof BaseEntity>[]> {
        return await this.pupilFeedbackService.getFeedbackPresignedPhotos(feedback.id);
    }

    @ResolveField(() => String)
    async privateNote(@Parent() feedback: LwpPupilFeedback, @AuthInfo('userType') userType: UserType): Promise<string> {
        if (userType === UserType.PARENT) return null;

        return await this.pupilFeedbackService.getFeedbackPrivateNote(feedback.id);
    }

    @ResolveField(() => LwpPupilFeedbackMedia)
    async audios(@Parent() feedback: LwpPupilFeedback): Promise<Omit<LwpPupilFeedbackMedia, keyof BaseEntity>[]> {
        return await this.pupilFeedbackService.getFeedbackPresignedAudios(feedback.id);
    }

    @ResolveField(() => LwpPupilTopic, { nullable: true })
    async pupilTopic(@Parent() feedback: LwpPupilFeedback): Promise<LwpPupilTopic> {
        return await this.pupilFeedbackService.getPupilTopicOfPupilFeedback(feedback);
    }

    @ResolveField(() => Number)
    async pupilCount(@Parent() feedback: LwpPupilFeedback): Promise<number> {
        return await this.pupilFeedbackService.getPupilCount(feedback.id);
    }

    @ResolveField(() => LwpPupil, { nullable: true })
    async pupil(@Parent() feedback: LwpPupilFeedback): Promise<LwpPupil> {
        return await this.pupilFeedbackService.getPupilOfFeedback(feedback.id);
    }

    @ResolveField(() => [PupilHistoryOutput])
    async historyLogs(@Parent() feedback: LwpPupilFeedback): Promise<PupilHistoryOutput[]> {
        return await this.pupilFeedbackService.getHistoryOfFeedback(feedback.id);
    }

    @ResolveField(() => LastPupilHistoryOutput)
    async lastAction(
        @Parent() feedback: LwpPupilFeedback,
        @Loader(LwpPupilFeedbackLastActionLoader) lastActionLoader: DataLoader<string, LastPupilHistoryOutput | null>
    ): Promise<LastPupilHistoryOutput> {
        return await lastActionLoader.load(feedback.id);
    }

    @ResolveField(() => [LwpPupil])
    async pupils(@Parent() feedback: LwpPupilFeedback): Promise<LwpPupil[]> {
        return await this.pupilFeedbackService.getPupilsOfFeedback(feedback.id);
    }

    @ResolveField(() => LwpSchool, { nullable: true })
    async school(
        @Parent() feedback: LwpPupilFeedback,
        @Loader(LwpPupilFeedbackSchoolLoader) schoolLoader: DataLoader<string, LwpSchool | null>
    ): Promise<LwpSchool> {
        return await schoolLoader.load(feedback.id);
    }

    @ResolveField(() => [LwpUser])
    async teacherLikes(@Parent() feedback: LwpPupilFeedback): Promise<LwpUser[]> {
        return await this.pupilFeedbackService.getTeacherLikesOfPupilFeedback(feedback.id);
    }

    @ResolveField(() => LwpPupilActivity)
    async activity(@Parent() feedback: LwpPupilFeedback): Promise<LwpPupilActivity> {
        return await this.pupilFeedbackService.getPupilActivityOfPupilFeedback(feedback.id);
    }

    @ResolveField(() => LwpUser)
    async logCreatedBy(@Parent() feedback: LwpPupilFeedback, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpUser> {
        return await this.pupilFeedbackService.getPupilFeedbackUser(feedback.id, authInfo.sub, authInfo.userType);
    }

    @ResolveField(() => String, { nullable: true })
    async userName(@Parent() feedback: LwpPupilFeedback, @AuthInfo() authInfo: AuthTokenJWT): Promise<string | null> {
        return await this.pupilFeedbackService.getPupilFeedbackUserName(
            feedback.id,
            authInfo.sub,
            authInfo.userType,
            authInfo.userTrustLevel
        );
    }

    @ResolveField(() => String)
    async className(@Parent() feedback: LwpPupilFeedback): Promise<string> {
        return await this.pupilFeedbackService.getFeedbackClassName(feedback);
    }

    @ResolveField(() => Boolean)
    async isFeedbackForMultipleClasses(@Parent() feedback: LwpPupilFeedback): Promise<boolean> {
        /**
         * Determines if the feedback involves multiple classes.
         * - If the feedback type is 'activity', it is considered to belong to a single class.
         * - Feedback is considered to span multiple classes when it is logged under the group reading tab.
         * - Individual feedback is always associated with a single class.
         */

        if (feedback.type === FeedbackType.ACTIVITY || !feedback.logOnReadingAsGroupTab) return false;

        return await this.pupilFeedbackService.isFeedbackDoneInMultipleClasses(feedback.id);
    }

    @ResolveField(() => String)
    async tickedBy(@Parent() feedback: LwpPupilFeedback): Promise<LwpUser> {
        return await this.pupilFeedbackService.getFeedbackTickedBy(feedback.id);
    }

    @ResolveField(() => [LwpFeedbackReply])
    async feedbackReplies(@Parent() feedback: LwpPupilFeedback): Promise<LwpFeedbackReply[]> {
        // if we joined & selected feedback replies it in the main query
        if (Array.isArray(feedback.feedbackReplies)) {
            return feedback.feedbackReplies;
        }

        // otherwise fall back to the service
        return await this.feedbackRepliesService.getRepliesByFeedbackId(feedback.id);
    }
}
