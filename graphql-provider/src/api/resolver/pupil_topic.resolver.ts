import { ExecutionContext } from '@nestjs/common';
import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { Loader } from 'nestjs-dataloader';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';
import { UserTrustLevel } from 'src/auth/types/UserTrustLevel';
import { UserType } from 'src/auth/types/UserType';
import { BaseEntity } from 'typeorm';

import { PupilReadingLogFeedbacksOutput } from '../dtos/PupilReadingLogFeedbacksOutput';
import { LwpClassTopic } from '../entities/class_topic';
import { LwpPupilFeedback } from '../entities/lwp_pupil_feedback';
import { LwpSetByTeacherStepMedia } from '../entities/lwp_set_by_teacher_step_media';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilTopic } from '../entities/pupil_topic';
import { LwpPupilActivity } from '../entities/pupil-activity';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpPupilFeedbackLoader } from '../loader/lwp_pupil_feedback.loader';
import { PupilActivitiesLoader } from '../loader/pupil_activities.loader';
import { SbtStepMediaLoader } from '../loader/sbt_step_media.loader';
import {
    DeviceType,
    OperationStatus,
    PupilTopicProgressInput,
    PupilTopicProgressOutput,
    PupilTotalStarCountOutput,
    UpdatePupilTopic
} from '../model';
import { ClassTopicService } from '../service/class_topic.service';
import { HelperService } from '../service/helper.service';
import { LwpPupilFeedbackService } from '../service/lwp_pupil_feedback.service';
import { PupilService } from '../service/pupil.service';
import { PupilActivityService } from '../service/pupil_activity.service';
import { PupilTopicService } from '../service/pupil_topic.service';
import { SchoolClassService } from '../service/school_class.service';
import { StaticLwpPeriodService } from '../service/static_period.service';

@Resolver(() => LwpPupilTopic)
export class PupilTopicResolver {
    constructor(
        private pupilTopicService: PupilTopicService,
        private pupilService: PupilService,
        private schoolClassService: SchoolClassService,
        private pupilActivityService: PupilActivityService,
        private classTopicService: ClassTopicService,
        private pupilFeedbackService: LwpPupilFeedbackService,
        private staticLwpPeriodSerivce: StaticLwpPeriodService,
        private helperService: HelperService
    ) {}

    @AuthorizeEndpoint([LwpPupilTopic, OpType.Write, 'id'])
    @Mutation(() => LwpPupilTopic)
    async pupilWatchedTopicVideo(@Args({ name: 'id' }) id: string): Promise<LwpPupilTopic> {
        return await this.pupilTopicService.pupilWatchedTopicVideo(id);
    }

    @AuthorizeEndpoint([LwpPupilTopic, OpType.Write, 'id'])
    @Mutation(() => Boolean)
    async pupilTopicOpened(
        @Args({ name: 'id' }) id: string,
        @AuthInfo('userType') userType: UserType,
        @AuthInfo('userTrustLevel') userTrustLevel: UserTrustLevel,
        @Context() context: ExecutionContext
    ): Promise<boolean> {
        const deviceType: DeviceType = this.helperService.extractDeviceTypeFromContext(context);

        await this.pupilTopicService.pupilTopicOpened(id, userType, userTrustLevel, deviceType);

        return true;
    }

    @AuthorizeEndpoint([LwpPupilTopic, OpType.Write, 'id'])
    @Mutation(() => Boolean)
    async unlockTopicActivities(@Args('id') id: string): Promise<boolean> {
        return await this.pupilTopicService.unlockTopicActivities(id);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'id'])
    @Query(() => [LwpPupilTopic])
    async getPupilTopics(@Args('id') id: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicService.getPupilTopics(id, { id: authInfo.sub, type: authInfo.userType });
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'id'])
    @Query(() => [LwpPupilTopic])
    async getRecommendedPupilTopics(@Args('id') id: string): Promise<LwpPupilTopic[]> {
        return await this.pupilTopicService.getRecommendedPupilTopics(id);
    }

    @AuthorizeEndpoint([LwpPupilTopic, OpType.Read, 'id'])
    @Query(() => LwpPupilTopic)
    async getPupilTopic(@Args('id') id: string, @AuthInfo() authInfo: AuthTokenJWT): Promise<LwpPupilTopic> {
        return await this.pupilTopicService.getPupilTopic(id, authInfo.sub, authInfo.userType, authInfo.status, authInfo.userTrustLevel);
    }

    @AuthorizeEndpoint([LwpPupilTopic, OpType.Read, 'pupilTopicId'])
    @Query(() => LwpPupilTopic)
    async getPupilTopicForScrapbook(@Args({ name: 'pupilTopicId' }) pupilTopicId: string): Promise<LwpPupilTopic> {
        return await this.pupilTopicService.getPupilTopicForScrapbook(pupilTopicId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilTopic, OpType.Read, 'id'])
    @Query(() => Boolean)
    async isPupilTopicCurrentReadingTopicInClass(@Args('id') id: string): Promise<boolean> {
        return await this.pupilTopicService.isPupilTopicCurrentReadingTopicInClass(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => [PupilReadingLogFeedbacksOutput])
    async getPupilReadingTopics(@Args('pupilId') pupilId: string): Promise<PupilReadingLogFeedbacksOutput[]> {
        return await this.pupilTopicService.getPupilReadingTopics(pupilId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async readingTopicReminders(): Promise<boolean> {
        return await this.pupilTopicService.readingTopicReminders();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deletePupilTopic(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.pupilTopicService.deletePupilTopics([id], userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminSendReleasedPupilTopicNotifications(): Promise<boolean> {
        return await this.pupilTopicService.sendReleasedPupilTopicNotifications();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async adminTopicReminderAfter7Days(): Promise<boolean> {
        return await this.pupilTopicService.topicReminderAfter7Days();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpPupilTopic)
    async updatePupilTopic(@Args({ name: 'input', type: () => UpdatePupilTopic }) input: UpdatePupilTopic): Promise<LwpPupilTopic> {
        return await this.pupilTopicService.updatePupilTopic(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupilTopic, OpType.Read, 'input.id'])
    @Query(() => [PupilTopicProgressOutput])
    async getPupilTopicProgress(
        @Args({ name: 'input', type: () => PupilTopicProgressInput }) input: PupilTopicProgressInput
    ): Promise<PupilTopicProgressOutput[]> {
        return await this.pupilTopicService.getPupilTopicProgress(input);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpPupil, OpType.Read, 'pupilIds'])
    @Query(() => Boolean)
    async shouldCountTowardsWeeklyReadingTarget(
        @Args({ name: 'pupilIds', type: () => [String] }) pupilIds: string[],
        @Args('readingDate') readingDate: Date
    ): Promise<boolean> {
        return await this.pupilTopicService.shouldCountTowardsWeeklyReadingTarget(pupilIds, readingDate);
    }

    @AuthorizeEndpoint([LwpPupil, OpType.Read, 'pupilId'])
    @Query(() => PupilTotalStarCountOutput)
    async getPupilTotalStarCount(@Args('pupilId') pupilId: string): Promise<PupilTotalStarCountOutput> {
        return await this.pupilTopicService.getPupilTotalStarCount(pupilId);
    }

    @ResolveField(() => LwpPupil)
    async pupil(@Parent() topic: LwpPupilTopic): Promise<LwpPupil> {
        return await this.pupilService.getPupilTopicPupil(topic.id);
    }

    @ResolveField(() => StaticLwpTopic)
    async topic(@Parent() topic: LwpPupilTopic): Promise<Omit<StaticLwpTopic, keyof BaseEntity>> {
        return await this.pupilTopicService.getTopicByPupilTopic(topic.id);
    }

    @ResolveField(() => LwpSchoolClass)
    async class(@Parent() topic: LwpPupilTopic): Promise<LwpSchoolClass> {
        return await this.schoolClassService.getClassByPupilTopic(topic.id);
    }

    @ResolveField(() => [LwpPupilActivity])
    async activities(
        @Parent() topic: LwpPupilTopic,
        @Loader(PupilActivitiesLoader) activitiesLoader: DataLoader<string, LwpPupilActivity[]>
    ): Promise<LwpPupilActivity[]> {
        return await activitiesLoader.load(topic.id);
    }

    @ResolveField(() => LwpClassTopic)
    async classTopic(@Parent() topic: LwpPupilTopic): Promise<LwpClassTopic> {
        return await this.classTopicService.getClassTopicByPupilTopic(topic.id);
    }

    @ResolveField(() => Boolean)
    async isInCurrentAcademicYear(@Parent() topic: LwpPupilTopic): Promise<boolean> {
        return await this.pupilTopicService.isPupilTopicInCurrentAcademicYear(topic.id);
    }

    @ResolveField(() => Boolean)
    async isInPreviousAcademicYear(@Parent() topic: LwpPupilTopic): Promise<boolean> {
        return await this.pupilTopicService.isPupilTopicInPreviousAcademicYear(topic.id);
    }

    @ResolveField(() => StaticLwpPeriod)
    async period(@Parent() topic: LwpPupilTopic): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodSerivce.getPupilTopicPeriod(topic.id);
    }

    @ResolveField(() => [LwpPupilFeedback])
    async readingLogFeedbacks(
        @Parent() topic: LwpPupilTopic,
        @Loader(LwpPupilFeedbackLoader) feedbackLoader: DataLoader<string, LwpPupilFeedback[]>
    ): Promise<LwpPupilFeedback[]> {
        return await feedbackLoader.load(topic.id);
    }

    @ResolveField(() => [LwpSetByTeacherStepMedia])
    async setByTeacherMedia(
        @Parent() topic: LwpPupilTopic,
        @Loader(SbtStepMediaLoader) sbtStepMediaLoader: DataLoader<string, LwpSetByTeacherStepMedia[]>
    ): Promise<LwpSetByTeacherStepMedia[]> {
        return await sbtStepMediaLoader.load(topic.id);
    }
}
