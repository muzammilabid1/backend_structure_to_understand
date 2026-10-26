import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { Loader } from 'nestjs-dataloader';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { StaticLwpYearGroup } from '../entities/year_group';
import { DomainSubjectLoader } from '../loader/domain_subject.loader';
import { OperationStatus, TopicDomainInput, UpdateTopicDomainInput } from '../model';
import { TopicService } from '../service/topic.service';
import { TopicDomainService } from '../service/topic_domain.service';

@Resolver(() => StaticLwpTopicDomain)
export class TopicDomainResolver {
    constructor(
        private topicDomainService: TopicDomainService,
        private topicService: TopicService
    ) {}

    @AuthorizeEndpoint(TeacherOnly)
    @Query(() => [StaticLwpTopicDomain])
    async allTopicDomains(): Promise<StaticLwpTopicDomain[]> {
        return await this.topicDomainService.allTopicDomains();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicDomain)
    async addTopicDomain(
        @Args({ name: 'input', type: () => TopicDomainInput }) input: TopicDomainInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicDomain> {
        return await this.topicDomainService.addTopicDomain(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicDomain)
    async updateTopicDomain(
        @Args({ name: 'input', type: () => UpdateTopicDomainInput }) input: UpdateTopicDomainInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicDomain> {
        return await this.topicDomainService.updateTopicDomain(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpTopicDomain])
    async getDomainsForDomainsOverview(
        @Args({ name: 'yearGroupIds', type: () => [String] }) yearGroupIds: string[],
        @Args({ name: 'subjectIds', type: () => [String] }) subjectIds: string[],
        @Args({ name: 'search', nullable: true }) search: string
    ): Promise<StaticLwpTopicDomain[]> {
        return await this.topicDomainService.getDomainsForDomainsOverview(yearGroupIds, subjectIds, search);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteTopicDomain(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.topicDomainService.deleteTopicDomain(id, userId);
    }

    @ResolveField(() => [StaticLwpYearGroup])
    async yearGroups(@Parent() domain: StaticLwpTopicDomain): Promise<StaticLwpYearGroup[]> {
        return this.topicDomainService.getDomainYearGroups(domain?.id);
    }

    @ResolveField(() => StaticLwpSubject)
    async subject(
        @Parent() domain: StaticLwpTopicDomain,
        @Loader(DomainSubjectLoader) domainSubjectLoader: DataLoader<string, StaticLwpSubject>
    ): Promise<StaticLwpSubject> {
        return domainSubjectLoader.load(domain.id);
    }

    @ResolveField(() => [StaticLwpTopic])
    async topics(@Parent() domain: StaticLwpTopicDomain): Promise<StaticLwpTopic[]> {
        return this.topicService.getTopicsOfDomain(domain?.id);
    }

    @ResolveField(() => Number)
    async topicCount(@Parent() domain: StaticLwpTopicDomain): Promise<number> {
        return this.topicService.getTopicsCountOfDomain(domain?.id);
    }
}
