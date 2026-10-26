import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Loader } from 'nestjs-dataloader';
import { AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AuthInfo } from 'src/auth/auth.object.decorators';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';
import { BaseEntity, Connection } from 'typeorm';

import { StaticLwpActivityLegacy } from '../dtos/StaticLwpActivityLegacy';
import { StaticLwpActivity, StaticLwpActivitySteps } from '../entities/activity';
import { LwpClassTopic } from '../entities/class_topic';
import { StaticLwpModal } from '../entities/modal';
import { StaticLwpActivityTag } from '../entities/static_lwp_activity_tag';
import { StaticLwpTopic } from '../entities/static_topic';
import { ActivityRationaleModalLoader } from '../loader/activity_rationale_modal.loader';
import { ActivityStepsLoader } from '../loader/activity_steps.loader';
import { ActivityTagsLoader } from '../loader/activity_tags.loader';
import { ActivityTopicLoader } from '../loader/activity_topic.loader';
import {
    ActivityInput,
    AddActivityStepsInput,
    OperationStatus,
    SetByTeacherDataOutput,
    UpdateActivityInput,
    UpdateActivityStepInput
} from '../model';
import { StaticLwpActivityTagService } from '../service/static_lwp_activity_tag.service';
import { ActivityService } from './../service/activity.service';
import { TopicService } from './../service/topic.service';

@Resolver(() => StaticLwpActivity)
export class ActivityResolver {
    constructor(
        private activityService: ActivityService,
        private topicService: TopicService,
        private staticLwpActivityTagService: StaticLwpActivityTagService,
        private connection: Connection
    ) {}

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Write, null])
    @Mutation(() => StaticLwpActivity)
    async addActivity(
        @Args({ name: 'input', type: () => ActivityInput }) input: ActivityInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpActivity> {
        return await this.activityService.addActivity(input, file, userId);
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Read, 'id'])
    @Query(() => StaticLwpActivity)
    async activity(@Args('id') id: string): Promise<StaticLwpActivity> {
        // @@@P - does this mean all logged-in users can access the static activity data? or is this actually only used by admins or something?
        return await this.activityService.getActivity(id);
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Read, 'id'])
    @Query(() => StaticLwpActivity)
    async getActivityForPreview(@Args('id') id: string): Promise<StaticLwpActivity> {
        return await this.activityService.getActivity(id);
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Read, null])
    @Query(() => [StaticLwpActivity])
    async allActivities(): Promise<Omit<StaticLwpActivity, keyof BaseEntity>[]> {
        return await this.activityService.allActivities();
    }

    @Public()
    @Query(() => StaticLwpActivity)
    async getDemoActivity(
        @Args('id') id: string,
        @Args({ name: 'magicLink', nullable: true }) magicLink: string
    ): Promise<StaticLwpActivity> {
        return await this.activityService.getDemoActivity(id, magicLink);
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteActivity(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        await this.connection.manager.transaction(async (manager) => {
            return await this.activityService.deleteActivity(id, userId, manager);
        });

        return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Write, 'input.id'])
    @Mutation(() => StaticLwpActivity)
    async updateActivity(
        @Args({ name: 'input', type: () => UpdateActivityInput }) input: UpdateActivityInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[]
    ): Promise<StaticLwpActivity> {
        return await this.activityService.updateActivity(input, file);
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Write, 'input.activityId'])
    @Mutation(() => StaticLwpActivity)
    async addActivitySteps(
        @Args({ name: 'input', type: () => AddActivityStepsInput }) input: AddActivityStepsInput
    ): Promise<StaticLwpActivity> {
        return await this.activityService.addActivitySteps(input);
    }

    @AuthorizeEndpoint([StaticLwpActivity, OpType.Write, null])
    @Mutation(() => Boolean)
    async duplicateActivity(
        @Args('activityId') activityId: string,
        @Args('topicId') topicId: string,
        @Args('order') order: number,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.activityService.duplicateActivity(activityId, topicId, order, userId);
    }

    @AuthorizeEndpoint([StaticLwpActivitySteps, OpType.Write, 'input.id'])
    @Mutation(() => StaticLwpActivitySteps)
    async updateLegacyActivityStep(
        @Args({ name: 'input', type: () => UpdateActivityStepInput }) input: UpdateActivityStepInput
    ): Promise<StaticLwpActivitySteps> {
        return await this.activityService.updateLegacyActivityStep(input);
    }

    @AuthorizeEndpoint([StaticLwpActivitySteps, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteActivityStep(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.activityService.deleteActivityStep(id, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpClassTopic, OpType.Read, 'classTopicId', { optional: true }])
    @Query(() => [SetByTeacherDataOutput])
    async getSetByTeacherStepsForTopic(
        @Args('topicId') topicId: string,
        @Args({ name: 'classTopicId', nullable: true }) classTopicId: string,
        @Args('isReleased') isReleased: boolean
    ): Promise<SetByTeacherDataOutput[]> {
        return await this.activityService.getSetByTeacherStepsForTopic(topicId, classTopicId, isReleased);
    }

    @ResolveField(() => StaticLwpActivityLegacy)
    async steps(
        @Parent() activity: StaticLwpActivity,
        @Loader(ActivityStepsLoader) activityStepsLoader: DataLoader<string, StaticLwpActivityLegacy>
    ): Promise<StaticLwpActivityLegacy> {
        return activityStepsLoader.load(activity.id);
    }

    @ResolveField(() => StaticLwpTopic)
    async topic(
        @Parent() activity: StaticLwpActivity,
        @Loader(ActivityTopicLoader) activityTopicLoader: DataLoader<string, StaticLwpTopic>
    ): Promise<StaticLwpTopic> {
        return activityTopicLoader.load(activity.id);
    }

    @ResolveField(() => StaticLwpModal, { nullable: true })
    async rationaleModal(
        @Parent() activity: StaticLwpActivity,
        @Loader(ActivityRationaleModalLoader) rationaleModalLoader: DataLoader<string, StaticLwpModal>
    ): Promise<StaticLwpModal> {
        if (!activity.rationaleModalId) return null;

        return rationaleModalLoader.load(activity.id);
    }

    @ResolveField(() => [StaticLwpActivityTag])
    async tags(
        @Parent() activity: StaticLwpActivity,
        @Loader(ActivityTagsLoader) activityTagsLoader: DataLoader<string, StaticLwpActivityTag[]>
    ): Promise<StaticLwpActivityTag[]> {
        return await activityTagsLoader.load(activity.id);
    }
}
