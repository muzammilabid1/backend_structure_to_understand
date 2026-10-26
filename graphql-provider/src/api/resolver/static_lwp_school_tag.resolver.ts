import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';

import { LwpSchool } from '../entities/school';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { CreateLwpSchoolTagInput, OperationStatus, UpdateLwpSchoolTagInput } from '../model';
import { StaticLwpSchoolTagService } from '../service/static_lwp_school_tag.service';

@Resolver(() => StaticLwpSchoolTag)
export class StaticLwpSchoolTagResolver {
    constructor(
        private lwpschoolTagService: StaticLwpSchoolTagService,
        private shallowUserService: ShallowUserService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpSchoolTag)
    async addSchoolTag(
        @Args({ name: 'input', type: () => CreateLwpSchoolTagInput }) input: CreateLwpSchoolTagInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpSchoolTag> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.lwpschoolTagService.addNewTag(input, user);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpSchoolTag])
    async getSchoolTagsForAdmin(): Promise<StaticLwpSchoolTag[]> {
        return await this.lwpschoolTagService.getTagsForAdmin();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpSchoolTag)
    async updateSchoolTag(
        @Args({ name: 'input', type: () => UpdateLwpSchoolTagInput }) input: UpdateLwpSchoolTagInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpSchoolTag> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.lwpschoolTagService.updateTag(input, user);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteSchoolTag(@Args({ name: 'id' }) id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        const user = this.shallowUserService.newShallowUser(userId);

        return await this.lwpschoolTagService.deleteTag(id, user);
    }

    @AuthorizeEndpoint(AdminOnly)
    @ResolveField()
    async schools(@Parent() schoolTag: StaticLwpSchoolTag): Promise<LwpSchool[]> {
        return await this.lwpschoolTagService.getSchoolsByTagId(schoolTag.id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @ResolveField()
    async schoolCounts(@Parent() schoolTag: StaticLwpSchoolTag): Promise<number> {
        return await this.lwpschoolTagService.getSchoolsCountByTagId(schoolTag.id);
    }
}
