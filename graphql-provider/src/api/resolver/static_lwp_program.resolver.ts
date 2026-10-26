import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { appConstants } from 'src/constants';

import { StaticLwpProgram } from '../entities/static_lwp_program';
import { CreateNewProgramInput, OperationStatus, UpdateProgramInput } from '../model';
import { HelperService } from '../service/helper.service';
import { StaticLwpProgramService } from '../service/static_lwp_program.service';

@Resolver(() => StaticLwpProgram)
export class StaticLwpProgramResolver {
    constructor(
        private lwpProgramService: StaticLwpProgramService,
        private helperService: HelperService
    ) {}

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpProgram)
    async createNewProgram(
        @Args('input') input: CreateNewProgramInput,
        @Args({ name: 'logo', type: () => GraphQLUpload, nullable: true }) logo: FileUpload,
        @Args({ name: 'character', type: () => GraphQLUpload, nullable: true }) character: FileUpload,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpProgram> {
        return this.lwpProgramService.createNewProgram(input, logo, character, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpProgram)
    async updateProgram(
        @Args('input') input: UpdateProgramInput,
        @Args({ name: 'logo', type: () => GraphQLUpload, nullable: true }) logo: FileUpload,
        @Args({ name: 'character', type: () => GraphQLUpload, nullable: true }) character: FileUpload,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpProgram> {
        return this.lwpProgramService.updateProgram(input, logo, character, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpProgram])
    async getProgramsForAdmin(): Promise<StaticLwpProgram[]> {
        return this.lwpProgramService.getProgramsForAdmin();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async removeProgram(@Args('id') id: string): Promise<OperationStatus> {
        return this.lwpProgramService.removeProgram(id);
    }

    @ResolveField(() => String, { nullable: true })
    logoUrl(@Parent() sticker: StaticLwpProgram): string {
        if (!sticker.logoFileName) return null;

        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.uploadedProgramLogo}/${sticker.logoFileName}`);
    }

    @ResolveField(() => String, { nullable: true })
    characterUrl(@Parent() sticker: StaticLwpProgram): string {
        if (!sticker.characterFileName) return null;

        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.uploadedProgramCharacter}/${sticker.characterFileName}`);
    }
}
