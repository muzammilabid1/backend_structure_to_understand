import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';

import { StaticLwpTopicTag } from '../entities/static_lwp_topic_tag';
import { StaticLwpTopic } from '../entities/static_topic';
import { LwpTopicTagInput, LwpTopicTagUpdateInput, OperationStatus } from '../model';
import { StaticLwpTopicTagService } from '../service/static_lwp_topic_tag.service';

@Resolver(() => StaticLwpTopicTag)
export class StaticLwpTopicTagResolver {
    constructor(
        private lwpTopicTagService: StaticLwpTopicTagService,
        private shallowUserService: ShallowUserService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicTag)
    async addTopicTag(
        @Args({ name: 'input', type: () => LwpTopicTagInput }) input: LwpTopicTagInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicTag> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.lwpTopicTagService.addNewTag(input, user);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicTag)
    async updateTopicTag(
        @Args({ name: 'input', type: () => LwpTopicTagUpdateInput }) input: LwpTopicTagUpdateInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicTag> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.lwpTopicTagService.updateTag(input, user);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpTopicTag])
    async getTopicTagsForAdmin(): Promise<StaticLwpTopicTag[]> {
        return await this.lwpTopicTagService.getTagsForAdmin();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpTopic])
    async getTagTopics(@Args('id') id: string): Promise<StaticLwpTopic[]> {
        return await this.lwpTopicTagService.getTagTopics(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteTopicTag(@Args({ name: 'id' }) id: string, @AuthInfo('sub') @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.lwpTopicTagService.deleteTag(id, user);
    }

    @ResolveField()
    async topics(@Parent() topicTag: StaticLwpTopicTag): Promise<StaticLwpTopic[]> {
        return await this.lwpTopicTagService.getTagTopics(topicTag?.id);
    }

    @ResolveField()
    async topicCount(@Parent() topicTag: StaticLwpTopicTag): Promise<number> {
        return await this.lwpTopicTagService.getTagTopicsCount(topicTag?.id);
    }
}
