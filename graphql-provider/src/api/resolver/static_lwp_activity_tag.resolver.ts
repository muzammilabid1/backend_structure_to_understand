import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { BaseEntity } from 'typeorm';

import { StaticLwpActivityTag } from '../entities/static_lwp_activity_tag';
import { LwpActivityTagInput, LwpTagUpdateInput, OperationStatus } from '../model';
import { StaticLwpActivityTagService } from '../service/static_lwp_activity_tag.service';

@Resolver(() => StaticLwpActivityTag)
export class StaticLwpActivityTagResolver {
    constructor(
        private staticLwpActivityTagService: StaticLwpActivityTagService,
        private shallowUserService: ShallowUserService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpActivityTag)
    async addTag(
        @Args({ name: 'input', type: () => LwpActivityTagInput }) input: LwpActivityTagInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpActivityTag> {
        const shallowUser = this.shallowUserService.newShallowUser(userId);

        return await this.staticLwpActivityTagService.addNewTag(input, shallowUser);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpActivityTag])
    async allTags(): Promise<Omit<StaticLwpActivityTag, keyof BaseEntity>[]> {
        return await this.staticLwpActivityTagService.allTags();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpActivityTag)
    async getTag(@Args('id') id: string): Promise<StaticLwpActivityTag> {
        return await this.staticLwpActivityTagService.getTag(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpActivityTag])
    async getTagsForAdmin(): Promise<StaticLwpActivityTag[]> {
        return await this.staticLwpActivityTagService.getTagsForAdmin();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpActivityTag)
    async updateTag(
        @Args({ name: 'input', type: () => LwpTagUpdateInput }) input: LwpTagUpdateInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpActivityTag> {
        const shallowUser = this.shallowUserService.newShallowUser(userId);

        return await this.staticLwpActivityTagService.updateTag(input, shallowUser);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteTag(@Args({ name: 'id' }) id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.staticLwpActivityTagService.deleteTag(id, user);
    }
}
