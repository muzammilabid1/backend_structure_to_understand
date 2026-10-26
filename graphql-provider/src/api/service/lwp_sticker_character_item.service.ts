import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { FileUploadToken } from 'src/auth/types/FileUploadToken';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { LwpStickerCharacterItem } from '../entities/lwp_sticker_character_item';
import { CreateStickerCharacterItemInput, ErrorStatusCodeEnum, StickerCharacterItemType, UpdateStickerCharacterItemInput } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class LwpStickerCharacterItemService {
    constructor(
        @InjectRepository(LwpStickerCharacterItem)
        private stickerCharacterItemRepository: Repository<LwpStickerCharacterItem>,
        private shallowUserService: ShallowUserService,
        private helperService: HelperService
    ) {}

    async getStickerAssetsByTypeForAdmin(type: StickerCharacterItemType, isActive: boolean): Promise<LwpStickerCharacterItem[]> {
        return this.stickerCharacterItemRepository.find({
            where: {
                type,
                isActive
            },
            order: { logCreatedAt: 'DESC' }
        });
    }

    async getStickerAssetsByTypeForSticker(type: StickerCharacterItemType): Promise<LwpStickerCharacterItem[]> {
        return this.stickerCharacterItemRepository.find({
            where: {
                type,
                isActive: true
            },
            order: { logCreatedAt: 'DESC' }
        });
    }

    async createStickerAsset(
        input: CreateStickerCharacterItemInput,
        file: FileUploadToken,
        userId: string
    ): Promise<LwpStickerCharacterItem> {
        const user = this.shallowUserService.newShallowUser(userId);

        const stickerAsset = new LwpStickerCharacterItem();

        const filename = `${nanoid()}.png`;

        await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedStickersCharacterItem}/${filename}`, file, true);

        stickerAsset.fileName = filename;

        stickerAsset.alt = input.alt;

        stickerAsset.isActive = true;
        stickerAsset.type = input.type;
        stickerAsset.logCreatedBy = user;
        stickerAsset.logUpdatedBy = user;

        return this.stickerCharacterItemRepository.save(stickerAsset);
    }

    async updateStickerAsset(
        input: UpdateStickerCharacterItemInput,
        file: FileUploadToken,
        userId: string
    ): Promise<LwpStickerCharacterItem> {
        const user = this.shallowUserService.newShallowUser(userId);

        const stickerAsset = await this.stickerCharacterItemRepository.findOne(input.id);

        if (!stickerAsset) throw new HttpException('Sticker character or item does not exist', ErrorStatusCodeEnum._535);

        if (file && stickerAsset.fileName) {
            await this.helperService.removeFile(
                `${appConstants.minioPaths.public.uploadedStickersCharacterItem}/${stickerAsset.fileName}`,
                true
            );

            const filename = `${nanoid()}.png`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedStickersCharacterItem}/${filename}`, file, true);

            stickerAsset.fileName = filename;
        }

        stickerAsset.alt = input.alt;
        stickerAsset.logUpdatedBy = user;

        return this.stickerCharacterItemRepository.save(stickerAsset);
    }

    async updateStickerAssetStatusByAdmin(stickerId: string, isActive: boolean, userId: string): Promise<LwpStickerCharacterItem> {
        const user = this.shallowUserService.newShallowUser(userId);

        const sticker = await this.stickerCharacterItemRepository.findOne(stickerId);

        if (!sticker) throw new HttpException('Sticker character or item does not exist', ErrorStatusCodeEnum._535);

        sticker.isActive = isActive;
        sticker.logUpdatedBy = user;

        return this.stickerCharacterItemRepository.save(sticker);
    }

    getImageUrl(fileName: string): string {
        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.uploadedStickersCharacterItem}/${fileName}`);
    }
}
