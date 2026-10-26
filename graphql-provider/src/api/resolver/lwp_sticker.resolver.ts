import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';

import { LwpSticker } from '../entities/lwp_sticker';
import { LwpStickerCharacterItem } from '../entities/lwp_sticker_character_item';
import { LwpSchool } from '../entities/school';
import { AllStickersOutput, CreateStickerInput, EditCreatedStickerInput, UpdateStickerInput } from '../model';
import { LwpStickerService } from '../service/lwp_sticker.service';

@Resolver(() => LwpSticker)
export class LwpStickerResolver {
    constructor(private stickerService: LwpStickerService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => AllStickersOutput)
    async getAllAdminStickers(): Promise<AllStickersOutput> {
        return this.stickerService.getAllAdminStickers();
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => AllStickersOutput)
    async getAllStickersForSchool(@Args('schoolId') schoolId: string): Promise<AllStickersOutput> {
        return this.stickerService.getAllStickersForSchool(schoolId);
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSticker])
    async getStickersForTeacher(@Args('schoolId') schoolId: string): Promise<LwpSticker[]> {
        return this.stickerService.getStickersForTeacher(schoolId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSticker, OpType.Read, 'id'])
    @Query(() => LwpSticker)
    async getStickerById(@Args('id') id: string): Promise<LwpSticker> {
        return this.stickerService.getStickerById(id);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'input.schoolId', { optional: true }])
    @Mutation(() => LwpSticker)
    async createSticker(
        @Args({
            name: 'input',
            type: () => CreateStickerInput
        })
        input: CreateStickerInput,
        @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpSticker> {
        const school = await this.stickerService.validateSchoolId(authInfo.isSchoolLeader, input.schoolId);

        return this.stickerService.createSticker(input, file, school, authInfo.sub);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId', { optional: true }])
    @Mutation(() => LwpSticker)
    async uploadSticker(
        @Args('alt') alt: string,
        @Args('schoolId', { nullable: true }) schoolId: string,
        @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpSticker> {
        const school = await this.stickerService.validateSchoolId(authInfo.isSchoolLeader, schoolId);

        return this.stickerService.uploadSticker(alt, file, school, authInfo.sub);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSticker, OpType.Write, 'input.id'])
    @Mutation(() => LwpSticker)
    async editUploadedSticker(
        @Args({ name: 'input', type: () => UpdateStickerInput }) input: UpdateStickerInput,
        @Args({ name: 'file', type: () => GraphQLUpload, nullable: true }) file: FileUpload,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSticker> {
        return this.stickerService.editUploadedSticker(input, file, userId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSticker, OpType.Write, 'input.stickerId'])
    @Mutation(() => LwpSticker)
    async editCreatedSticker(
        @Args({ name: 'input', type: () => EditCreatedStickerInput }) input: EditCreatedStickerInput,
        @Args({ name: 'file', type: () => GraphQLUpload, nullable: true }) file: FileUpload,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSticker> {
        return this.stickerService.editCreatedSticker(input, file, userId);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId', { optional: true }], [LwpSticker, OpType.Read, 'id'])
    @Mutation(() => Boolean)
    async activateDeactivateStickers(
        @Args('id') id: string,
        @Args('isActive') isActive: boolean,
        @Args('schoolId', { nullable: true }) schoolId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<boolean> {
        const school = await this.stickerService.validateSchoolId(authInfo.isSchoolLeader, schoolId);

        return this.stickerService.activateDeactivateStickers(id, isActive, school, authInfo.sub);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId', { optional: true }], [LwpSticker, OpType.Read, 'id'])
    @Mutation(() => LwpSticker)
    async duplicateSticker(
        @Args('id') id: string,
        @Args('schoolId', { nullable: true }) schoolId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<LwpSticker> {
        const school = await this.stickerService.validateSchoolId(authInfo.isSchoolLeader, schoolId);

        return this.stickerService.duplicateSticker(id, school, authInfo.sub);
    }

    @ResolveField(() => LwpStickerCharacterItem, { nullable: true })
    async character(@Parent() sticker: LwpSticker): Promise<LwpStickerCharacterItem> {
        return this.stickerService.getStickerCharacter(sticker.id);
    }

    @ResolveField(() => LwpStickerCharacterItem, { nullable: true })
    async item(@Parent() sticker: LwpSticker): Promise<LwpStickerCharacterItem> {
        return this.stickerService.getStickerItem(sticker.id);
    }

    @ResolveField(() => LwpStickerCharacterItem, { nullable: true })
    async school(@Parent() sticker: LwpSticker): Promise<LwpSchool> {
        return this.stickerService.getStickerSchool(sticker.id);
    }

    @ResolveField(() => String)
    imageUrl(@Parent() sticker: LwpSticker): string {
        return this.stickerService.getStickerUrl(sticker.fileName);
    }
}
