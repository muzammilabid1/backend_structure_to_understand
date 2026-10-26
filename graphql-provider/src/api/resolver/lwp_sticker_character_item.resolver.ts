import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';

import { LwpStickerCharacterItem } from '../entities/lwp_sticker_character_item';
import { CreateStickerCharacterItemInput, StickerCharacterItemType, UpdateStickerCharacterItemInput } from '../model';
import { LwpStickerCharacterItemService } from '../service/lwp_sticker_character_item.service';

@Resolver(() => LwpStickerCharacterItem)
export class LwpStickerCharacterItemResolver {
    constructor(private stickerCharacterItemService: LwpStickerCharacterItemService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpStickerCharacterItem])
    async getStickerAssetsByTypeForAdmin(
        @Args({ name: 'type', type: () => StickerCharacterItemType }) type: StickerCharacterItemType,
        @Args('isActive') isActive: boolean
    ): Promise<LwpStickerCharacterItem[]> {
        return this.stickerCharacterItemService.getStickerAssetsByTypeForAdmin(type, isActive);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpStickerCharacterItem)
    async createStickerAsset(
        @Args({ name: 'input', type: () => CreateStickerCharacterItemInput }) input: CreateStickerCharacterItemInput,
        @Args({ name: 'file', type: () => GraphQLUpload }) file: FileUpload,
        @AuthInfo('sub') userId: string
    ): Promise<LwpStickerCharacterItem> {
        return this.stickerCharacterItemService.createStickerAsset(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpStickerCharacterItem)
    async updateStickerAsset(
        @Args({ name: 'input', type: () => UpdateStickerCharacterItemInput }) input,
        @Args({ name: 'file', type: () => GraphQLUpload, nullable: true }) file: FileUpload,
        @AuthInfo('sub') userId: string
    ): Promise<LwpStickerCharacterItem> {
        return this.stickerCharacterItemService.updateStickerAsset(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpStickerCharacterItem)
    async updateStickerAssetStatusByAdmin(
        @Args('id') id: string,
        @Args({ name: 'isActive', type: () => Boolean }) isActive: boolean,
        @AuthInfo('sub') userId: string
    ): Promise<LwpStickerCharacterItem> {
        return this.stickerCharacterItemService.updateStickerAssetStatusByAdmin(id, isActive, userId);
    }

    @AuthorizeEndpoint(LeaderOnly)
    @Query(() => [LwpStickerCharacterItem])
    async getStickerAssetsByTypeForSticker(
        @Args({ name: 'type', type: () => StickerCharacterItemType }) type: StickerCharacterItemType
    ): Promise<LwpStickerCharacterItem[]> {
        return this.stickerCharacterItemService.getStickerAssetsByTypeForSticker(type);
    }

    @ResolveField(() => String)
    imageUrl(@Parent() sticker: LwpStickerCharacterItem): string {
        return this.stickerCharacterItemService.getImageUrl(sticker.fileName);
    }
}
