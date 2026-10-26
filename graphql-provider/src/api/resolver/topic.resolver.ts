import { HttpException } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { Loader } from 'nestjs-dataloader';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';
import { Repository } from 'typeorm';

import { TopicWithActivitiesForAdmin } from '../dtos/TopicWithActivitiesForAdmin';
import { StaticLwpActivity } from '../entities/activity';
import { LwpSchool } from '../entities/school';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopicTag } from '../entities/static_lwp_topic_tag';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from '../entities/static_topic_domain_year_group';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { StaticLwpYearGroup } from '../entities/year_group';
import { ActivityLoader } from '../loader/activity.loader';
import { DomainsLoader } from '../loader/domains.loader';
import { ReadyTeddyLoader } from '../loader/ready_teddy.loader';
import { SchoolTagsLoader } from '../loader/school_tags.loader';
import { SetByTeacherStepsLoader } from '../loader/set_by_teacher_steps.loader';
import { TagsLoader } from '../loader/tags.loader';
import { TopicReleasedInCurrentOrFutureYearLoader } from '../loader/topic_released_in_current_or_future_year.loader';
import { YearGroupsLoader } from '../loader/year_groups.loader';
import { ErrorStatusCodeEnum, OperationStatus, TopicFilter, TopicInput, UpdateTopicInput } from '../model';
import { ActivityService } from '../service/activity.service';
import { StaticLwpTopicTagService } from '../service/static_lwp_topic_tag.service';
import { TopicService } from '../service/topic.service';
import { YearGroupService } from '../service/year_group.service';

@Resolver(() => StaticLwpTopic)
export class TopicResolver {
    constructor(
        @InjectRepository(StaticLwpTopic)
        private topicRepository: Repository<StaticLwpTopic>,
        private topicService: TopicService,
        private lwpTopicTagService: StaticLwpTopicTagService,
        private activityService: ActivityService,
        private yearGroupService: YearGroupService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopic)
    async addTopic(
        @Args({ name: 'input', type: () => TopicInput }) input: TopicInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopic> {
        return this.topicService.addTopic(input, file, userId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId', { optional: true }])
    @Query(() => [StaticLwpTopic])
    async allTopics(
        @Args({ name: 'filter', type: () => TopicFilter, nullable: true }) filter: TopicFilter,
        @Args({ name: 'schoolId', nullable: true }) schoolId: string,
        @Args({ name: 'classId', nullable: true }) classId: string
    ): Promise<StaticLwpTopic[]> {
        return await this.topicService.allTopics(filter, schoolId, classId);
    }

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => [StaticLwpYearGroup])
    async allYearGroupsWithTopics(
        @Args('schoolId') schoolId: string,
        @Args({ name: 'classId', nullable: true }) classId: string
    ): Promise<StaticLwpYearGroup[]> {
        return await this.topicService.allYearGroupsWithTopics(schoolId, classId);
    }

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => [StaticLwpSubject])
    async allSubjectsWithTopics(
        @Args({ name: 'yearGroupIds', type: () => [String], nullable: true }) yearGroupIds: string[],
        @Args({ name: 'classId', nullable: true }) classId: string,
        @Args('schoolId') schoolId: string
    ): Promise<StaticLwpSubject[]> {
        return await this.topicService.allSubjectsWithTopics(schoolId, yearGroupIds, classId);
    }

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => [StaticLwpTopicDomain])
    async allTopicDomainsWithTopics(
        @Args('schoolId') schoolId: string,
        @Args({ name: 'classId', nullable: true }) classId: string,
        @Args({ name: 'yearGroupIds', type: () => [String], nullable: true }) yearGroupIds: string[],
        @Args({ name: 'subjects', type: () => [String], nullable: true }) subjects: [string]
    ): Promise<StaticLwpTopicDomain[]> {
        return await this.topicService.allTopicDomainsWithTopics(schoolId, yearGroupIds, subjects, classId);
    }

    @AuthorizeEndpoint([StaticLwpTopic, OpType.Read, 'id'])
    @Query(() => StaticLwpTopic)
    async topic(@Args('id') id: string): Promise<StaticLwpTopic> {
        const topic = await this.topicService.getTopic(id);

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        return topic;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpTopic])
    async getTopicsOfDomain(@Args('domainId') domainId: string): Promise<StaticLwpTopic[]> {
        return await this.topicService.getTopicsOfDomain(domainId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpTopic)
    async getTopicForAdmin(@Args('id') id: string): Promise<StaticLwpTopic> {
        const topic = await this.topicService.getTopicForAdmin(id);

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        return topic;
    }

    @Public()
    @Query(() => StaticLwpTopic)
    async getTopicForPreview(@Args('id') id: string): Promise<StaticLwpTopic> {
        const topic = await this.topicService.getTopic(id);

        if (!topic) throw new HttpException('Topic does not exist', ErrorStatusCodeEnum._535);

        return topic;
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => TopicWithActivitiesForAdmin)
    async getTopicWithActivitiesForAdmin(@Args('id') id: string): Promise<TopicWithActivitiesForAdmin> {
        return await this.topicService.getTopicWithActivitiesForAdmin(id);
    }

    @Public()
    @Query(() => StaticLwpTopic)
    async getDemoTopic(@Args('id') id: string, @Args({ name: 'magicLink', nullable: true }) magicLink: string): Promise<StaticLwpTopic> {
        return await this.topicService.getDemoTopic(id, magicLink);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteTopic(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.topicService.deleteTopic(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopic)
    async updateTopic(
        @Args({ name: 'input', type: () => UpdateTopicInput }) input: UpdateTopicInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopic> {
        return this.topicService.updateTopic(input, file, userId);
    }

    @ResolveField(() => [StaticLwpActivity])
    async activities(
        @Parent() topic: StaticLwpTopic,
        @Loader(ActivityLoader) activityLoader: DataLoader<string, StaticLwpActivity[]>
    ): Promise<StaticLwpActivity[]> {
        return await activityLoader.load(topic.id);
    }

    @ResolveField(() => [StaticLwpTopicDomain])
    async domains(
        @Parent() topic: StaticLwpTopic,
        @Loader(DomainsLoader) domainsLoader: DataLoader<string, StaticLwpTopicDomain[]>
    ): Promise<StaticLwpTopicDomain[]> {
        return await domainsLoader.load(topic.id);
    }

    @ResolveField(() => [StaticLwpYearGroup])
    async yearGroups(
        @Parent() topic: StaticLwpTopic,
        @Loader(YearGroupsLoader) yearGroupsLoader: DataLoader<string, StaticLwpYearGroup[]>
    ): Promise<StaticLwpYearGroup[]> {
        return await yearGroupsLoader.load(topic.id);
    }

    @ResolveField(() => [StaticLwpTopicDomainYearGroup])
    async domainsAndYearGroups(@Parent() topic: StaticLwpTopic): Promise<StaticLwpTopicDomainYearGroup[]> {
        return this.topicService.getDomainsAndYearGroupsForTopic(topic?.id);
    }

    @ResolveField()
    async tags(
        @Parent() topic: StaticLwpTopic,
        @Loader(TagsLoader) tagsLoader: DataLoader<string, StaticLwpTopicTag[]>
    ): Promise<StaticLwpTopicTag[]> {
        return tagsLoader.load(topic.id);
    }

    @ResolveField()
    async schoolTags(
        @Parent() topic: StaticLwpTopic,
        @Loader(SchoolTagsLoader) schoolTagsLoader: DataLoader<string, StaticLwpSchoolTag[]>
    ): Promise<StaticLwpSchoolTag[]> {
        return schoolTagsLoader.load(topic.id);
    }

    @ResolveField(() => Boolean)
    async isReadyTeddyTopic(
        @Parent() topic: StaticLwpTopic,
        @Loader(ReadyTeddyLoader) readyTeddyLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return await readyTeddyLoader.load(topic.id);
    }

    @ResolveField(() => Boolean)
    async hasSetByTeacherSteps(
        @Parent() topic: StaticLwpTopic,
        @Loader(SetByTeacherStepsLoader) setByTeacherStepsLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return await setByTeacherStepsLoader.load(topic.id);
    }

    @ResolveField(() => Boolean)
    async hasBeenReleasedInCurrentOrFutureAcademicYear(
        @Parent() topic: StaticLwpTopic,
        @Loader(TopicReleasedInCurrentOrFutureYearLoader) topicReleasedLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return await topicReleasedLoader.load(topic.id);
    }
}
