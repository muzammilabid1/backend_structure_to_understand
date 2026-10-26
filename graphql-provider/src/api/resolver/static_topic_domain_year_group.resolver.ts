import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from '../entities/static_topic_domain_year_group';
import { StaticLwpTopicDomain } from '../entities/topic_domain';
import { StaticLwpYearGroup } from '../entities/year_group';
import { StaticLwpTopicDomainYearGroupService } from '../service/static_topic_domain_year_group.service';

@Resolver(() => StaticLwpTopicDomainYearGroup)
export class StaticLwpTopicDomainYearGroupResolver {
    constructor(private lwpTopicDomainYearGroupService: StaticLwpTopicDomainYearGroupService) {}

    @ResolveField(() => StaticLwpTopic)
    async topic(@Parent() topic: StaticLwpTopicDomainYearGroup): Promise<StaticLwpTopic> {
        return await this.lwpTopicDomainYearGroupService.getTopicOfStaticTopicDomainYearGroup(topic.id);
    }

    @ResolveField(() => StaticLwpTopicDomain)
    async domain(@Parent() topic: StaticLwpTopicDomainYearGroup): Promise<StaticLwpTopicDomain> {
        return await this.lwpTopicDomainYearGroupService.getDomainOfStaticTopicDomainYearGroup(topic.id);
    }

    @ResolveField(() => StaticLwpYearGroup)
    async yearGroup(@Parent() topic: StaticLwpTopicDomainYearGroup): Promise<StaticLwpYearGroup> {
        return this.lwpTopicDomainYearGroupService.getYearGroupOfStaticTopicDomainYearGroup(topic?.id);
    }
}
