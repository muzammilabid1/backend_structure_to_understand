import { HttpException } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AdminField, AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { AuthInfo, AuthorizeEndpoint, Public } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';

import { AllPageAnnouncementsForUserOutput } from '../dtos/AllPageAnnouncementsForUserOutput';
import { StaticLwpPageAnnouncement } from '../entities/static_lwp_page_announcement';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';
import { AddPageAnnouncementInput, ErrorStatusCodeEnum, OperationStatus, UpdatePageAnnouncementInput } from '../model';
import { HelperService } from '../service/helper.service';
import { StaticLwpPageAnnouncementService } from '../service/static_lwp_page_announcement.service';

@Resolver(() => StaticLwpPageAnnouncement)
export class StaticLwpPageAnnouncementResolver {
    constructor(
        private pageAnnouncementService: StaticLwpPageAnnouncementService,
        private helperService: HelperService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpPageAnnouncement])
    async getAllPageAnnouncements(): Promise<StaticLwpPageAnnouncement[]> {
        return await this.pageAnnouncementService.getAllPageAnnouncements();
    }

    // We will use this query in our unauthenticated pages
    @Public()
    @Query(() => [StaticLwpPageAnnouncement])
    async getPageAnnouncementsForAllUsers(): Promise<StaticLwpPageAnnouncement[]> {
        return await this.pageAnnouncementService.getPageAnnouncementsForAllUsers();
    }

    // We will use this query in our authenticated pages
    @AuthorizeEndpoint([LwpUser, OpType.Read, 'id'])
    @Query(() => [AllPageAnnouncementsForUserOutput])
    async getAllPageAnnouncementsForUser(@Args({ name: 'id' }) id: string): Promise<AllPageAnnouncementsForUserOutput[]> {
        return await this.pageAnnouncementService.getAllPageAnnouncementsForUser(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpPageAnnouncement)
    async getPageAnnouncement(@Args({ name: 'id' }) id: string): Promise<StaticLwpPageAnnouncement> {
        return await this.pageAnnouncementService.getPageAnnouncement(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async addPageAnnouncement(
        @AuthInfo('sub') userId: string,
        @Args({ name: 'input', type: () => AddPageAnnouncementInput }) input: AddPageAnnouncementInput,
        @Args({ name: 'file', type: () => GraphQLUpload, nullable: true }) file?: FileUpload
    ): Promise<boolean> {
        if (!input.schoolTagIds.length && !input.userOptions.length)
            throw new HttpException(
                'Invalid request: please specify at least one user option or school tag to target the announcement.',
                ErrorStatusCodeEnum._535
            );

        return await this.pageAnnouncementService.addPageAnnouncement(input, userId, file);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async updatePageAnnouncement(
        @AuthInfo('sub') userId: string,
        @Args({ name: 'input', type: () => UpdatePageAnnouncementInput }) input: UpdatePageAnnouncementInput,
        @Args({ name: 'file', type: () => GraphQLUpload, nullable: true }) file?: FileUpload
    ): Promise<boolean> {
        if (!input.schoolTagIds.length && !input.userOptions.length)
            throw new HttpException(
                'Invalid request: please specify at least one user option or school tag to target the announcement.',
                ErrorStatusCodeEnum._535
            );

        return await this.pageAnnouncementService.updatePageAnnouncement(input, userId, file);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deletePageAnnouncement(@Args('id') id: string): Promise<OperationStatus> {
        return await this.pageAnnouncementService.deletePageAnnouncement(id);
    }

    @ResolveField(() => String)
    @AuthorizeField(UnrestrictedField)
    imageUrl(@Parent() pageAnnouncement: StaticLwpPageAnnouncement): string {
        return this.pageAnnouncementService.getPageAnnouncementImageUrl(pageAnnouncement);
    }

    @ResolveField(() => String)
    @AuthorizeField(AdminField)
    async schoolTags(@Parent() pageAnnouncement: StaticLwpPageAnnouncement): Promise<StaticLwpSchoolTag[]> {
        return await this.pageAnnouncementService.getSchoolTagsForPageAnnouncement(pageAnnouncement.id);
    }
}
