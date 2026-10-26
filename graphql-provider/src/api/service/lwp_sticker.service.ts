import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { nanoid } from 'nanoid';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { LwpAdminStickerSchoolStatus } from '../entities/lwp_admin_sticker_school_status';
import { LwpSticker } from '../entities/lwp_sticker';
import { LwpStickerCharacterItem } from '../entities/lwp_sticker_character_item';
import { LwpSchool } from '../entities/school';
import { AllStickersOutput, CreateStickerInput, EditCreatedStickerInput, ErrorStatusCodeEnum, UpdateStickerInput } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class LwpStickerService {
    constructor(
        @InjectRepository(LwpSticker)
        private stickerRepository: Repository<LwpSticker>,
        @InjectRepository(LwpStickerCharacterItem)
        private stickerCharacterItemRepository: Repository<LwpStickerCharacterItem>,
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(LwpAdminStickerSchoolStatus)
        private adminStickerSchoolStatusRepository: Repository<LwpAdminStickerSchoolStatus>,
        private shallowUserService: ShallowUserService,
        private helperService: HelperService
    ) {}

    async getAllAdminStickers(): Promise<AllStickersOutput> {
        // On the admin side, we only display stickers created by the admin, which means the school ID is null when the sticker is created.
        const allStickers = await this.stickerRepository.find({ where: { school: null }, order: { logCreatedAt: 'DESC' } });

        const output: AllStickersOutput = {
            active: allStickers.filter((sticker) => sticker.isActive),
            inActive: allStickers.filter((sticker) => !sticker.isActive)
        };

        return output;
    }

    async getAllStickersForSchool(schoolId: string): Promise<AllStickersOutput> {
        const query = await this.stickerRepository
            .createQueryBuilder('lwp_sticker')
            .leftJoinAndSelect('lwp_sticker.school', 'school')
            .leftJoinAndSelect(LwpAdminStickerSchoolStatus, 'status', 'status.stickerId = lwp_sticker.id and status.schoolId = :schoolId')
            .where('(school.id = :schoolId OR (school.id IS NULL AND lwp_sticker.isActive = true))')
            .setParameter('schoolId', schoolId)
            .select([
                'lwp_sticker.id as id',
                'lwp_sticker.fileName as "fileName"',
                'lwp_sticker.alt as "alt"',
                'lwp_sticker.label as "label"',
                'lwp_sticker.isActive as "isActive"',
                'school.id as "schoolId"',
                'status.id as "statusId"',
                'status.isActive as "schoolStatus"'
            ])
            .orderBy('lwp_sticker.logCreatedAt', 'DESC')
            .getRawMany();

        const activeStickers = query.filter(
            (sticker) => sticker.isActive && (sticker.schoolId || (!sticker.schoolId && (sticker.schoolStatus || !sticker.statusId)))
        );

        const inActiveStickers = query.filter((sticker) => sticker.schoolStatus === false || sticker.isActive === false);

        return { active: activeStickers, inActive: inActiveStickers };
    }

    public async validateSchoolId(isSchoolLeader: boolean, schoolId: string | null): Promise<LwpSchool> {
        if (isSchoolLeader && !schoolId) {
            throw new HttpException('School ID is required', ErrorStatusCodeEnum._535);
        }

        if (schoolId) {
            const school = await this.schoolRepository.findOne(schoolId, { select: ['id'] });

            if (!school) throw new HttpException(`School does not exist`, ErrorStatusCodeEnum._535);

            return school;
        }

        return null;
    }

    async uploadSticker(alt: string, file: FileUpload, school: LwpSchool, userId: string): Promise<LwpSticker> {
        const user = this.shallowUserService.newShallowUser(userId);

        const sticker = new LwpSticker();

        const filename = `${nanoid()}.png`;

        await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedStickers}/${filename}`, file, true);

        sticker.fileName = filename;

        sticker.alt = alt;

        sticker.isActive = true;

        sticker.logCreatedBy = user;
        sticker.logUpdatedBy = user;

        if (school) sticker.school = school;

        return this.stickerRepository.save(sticker);
    }

    async getStickerCharacterItemById(id: string, errorMessage: string, isActive = true): Promise<LwpStickerCharacterItem> {
        const where = {
            id
        };

        if (isActive) where['isActive'] = true;

        const item = await this.stickerCharacterItemRepository.findOne({
            where,
            select: ['id']
        });

        if (!item) throw new HttpException(`${errorMessage} does not exist`, ErrorStatusCodeEnum._535);

        return item;
    }

    async createSticker(input: CreateStickerInput, file: FileUpload, school: LwpSchool, userId: string): Promise<LwpSticker> {
        const user = this.shallowUserService.newShallowUser(userId);
        const sticker = new LwpSticker();

        if (input.characterId) {
            const character = await this.getStickerCharacterItemById(input.characterId, 'Character');

            sticker.character = character;
        }

        if (input.itemId) {
            const character = await this.getStickerCharacterItemById(input.itemId, 'Item');

            sticker.item = character;
        }

        if (school) sticker.school = school;

        const filename = `${nanoid()}.png`;

        await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedStickers}/${filename}`, file, true);

        sticker.fileName = filename;

        sticker.label = input.label;
        sticker.borderColor = input.borderColor;
        sticker.textColor = input.textColor;

        sticker.isActive = true;

        sticker.alt = `Sticker: ${input.label}`;

        sticker.logCreatedBy = user;
        sticker.logUpdatedBy = user;

        return this.stickerRepository.save(sticker);
    }

    async activateDeactivateStickers(stickerId: string, isActive: boolean, school: LwpSchool, userId: string): Promise<boolean> {
        const user = this.shallowUserService.newShallowUser(userId);

        const sticker = await this.stickerRepository.findOne({
            where: { id: stickerId },
            select: ['id', 'isActive'],
            relations: ['school']
        });

        if (!sticker) throw new HttpException('Sticker does not exist', ErrorStatusCodeEnum._535);

        if (school && !sticker.school) {
            const isSchoolStatusExit = await this.adminStickerSchoolStatusRepository.findOne({
                where: {
                    school: school.id,
                    sticker: stickerId
                },
                select: ['id', 'isActive']
            });

            const schoolStatus = isSchoolStatusExit ?? new LwpAdminStickerSchoolStatus();

            schoolStatus.sticker = sticker;
            schoolStatus.school = school;
            schoolStatus.isActive = isActive;

            if (!isSchoolStatusExit) schoolStatus.logCreatedBy = user;
            schoolStatus.logUpdatedBy = user;

            await this.adminStickerSchoolStatusRepository.save(schoolStatus);
        } else {
            sticker.isActive = isActive;
            sticker.logUpdatedBy = user;
            await this.stickerRepository.save(sticker);
        }

        return true;
    }

    async editUploadedSticker(input: UpdateStickerInput, file: FileUpload, userId: string): Promise<LwpSticker> {
        const user = this.shallowUserService.newShallowUser(userId);
        const sticker = await this.stickerRepository.findOne(input.id);

        if (!sticker) throw new HttpException('Sticker does not exist', ErrorStatusCodeEnum._535);

        if (file && sticker.fileName) {
            await this.helperService.removeFile(`${appConstants.minioPaths.public.uploadedStickers}/${sticker.fileName}`, true);

            const filename = `${nanoid()}.png`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedStickers}/${filename}`, file, true);

            sticker.fileName = filename;
        }

        sticker.alt = input.alt;
        sticker.logUpdatedBy = user;

        return this.stickerRepository.save(sticker);
    }

    async editCreatedSticker(input: EditCreatedStickerInput, file: FileUpload, userId: string): Promise<LwpSticker> {
        const user = this.shallowUserService.newShallowUser(userId);

        const sticker = await this.stickerRepository.findOne(input.stickerId);

        if (!sticker) throw new HttpException('Sticker does not exist', ErrorStatusCodeEnum._535);

        if (input.characterId) {
            const character = await this.getStickerCharacterItemById(input.characterId, 'Character');

            sticker.character = character;
        } else {
            sticker.character = null;
        }

        if (input.itemId) {
            const character = await this.getStickerCharacterItemById(input.itemId, 'Item');

            sticker.item = character;
        } else {
            sticker.item = null;
        }

        if (file && sticker.fileName) {
            await this.helperService.removeFile(`${appConstants.minioPaths.public.uploadedStickers}/${sticker.fileName}`, true);

            const filename = `${nanoid()}.png`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.uploadedStickers}/${filename}`, file, true);

            sticker.fileName = filename;
        }

        sticker.logUpdatedBy = user;

        sticker.textColor = input.textColor;
        sticker.borderColor = input.borderColor;
        sticker.label = input.label;

        sticker.alt = `Sticker: ${input.label}`;

        return this.stickerRepository.save(sticker);
    }

    async duplicateSticker(id: string, school: LwpSchool, userId: string): Promise<LwpSticker> {
        const user = this.shallowUserService.newShallowUser(userId);

        const stickerToDuplicate = await this.stickerRepository.findOne(id, {
            relations: ['character', 'item', 'school']
        });

        if (!stickerToDuplicate) throw new HttpException('Sticker does not exist', ErrorStatusCodeEnum._535);

        const newSticker = new LwpSticker();

        if (stickerToDuplicate.fileName) {
            const newFileName = await this.helperService.duplicateFile(
                appConstants.minioPaths.public.uploadedStickers,
                stickerToDuplicate.fileName,
                `${nanoid()}.png`,
                true
            );

            newSticker.fileName = newFileName;
        }

        if (stickerToDuplicate.alt) newSticker.alt = stickerToDuplicate.alt;
        if (stickerToDuplicate.character) newSticker.character = stickerToDuplicate.character;
        if (stickerToDuplicate.item) newSticker.item = stickerToDuplicate.item;
        if (stickerToDuplicate.textColor) newSticker.textColor = stickerToDuplicate.textColor;
        if (stickerToDuplicate.borderColor) newSticker.borderColor = stickerToDuplicate.borderColor;
        if (stickerToDuplicate.label) newSticker.label = stickerToDuplicate.label;

        if (school) {
            newSticker.school = school;
            if (!stickerToDuplicate.school) {
                const schoolStatus = await this.adminStickerSchoolStatusRepository.findOne({
                    where: { school: school.id, sticker: id },
                    select: ['id', 'isActive']
                });

                newSticker.isActive = schoolStatus ? schoolStatus.isActive : true;
            } else {
                newSticker.isActive = stickerToDuplicate.isActive;
            }
        } else {
            newSticker.isActive = stickerToDuplicate.isActive;
        }

        newSticker.logCreatedBy = user;
        newSticker.logUpdatedBy = user;

        return this.stickerRepository.save(newSticker);
    }

    async getStickersForTeacher(schoolId: string): Promise<LwpSticker[]> {
        return this.stickerRepository
            .createQueryBuilder('lwp_sticker')
            .leftJoin('lwp_sticker.school', 'school')
            .leftJoin(LwpAdminStickerSchoolStatus, 'status', 'status.stickerId = lwp_sticker.id and status.schoolId = :schoolId', {
                schoolId
            })
            .where('(school.id = :schoolId OR (school.id IS NULL AND lwp_sticker.isActive = true))', { schoolId })
            .andWhere(
                'lwp_sticker.isActive = true AND (school.id IS NOT NULL OR (school.id IS NULL AND (status.isActive = true OR status.id IS NULL)))'
            )
            .orderBy('lwp_sticker.logCreatedAt', 'DESC')
            .getMany();
    }

    async getStickerById(id: string): Promise<LwpSticker> {
        const sticker = await this.stickerRepository.findOne(id);

        return sticker;
    }

    async getStickerCharacter(stickerId: string): Promise<LwpStickerCharacterItem> {
        const sticker = await this.stickerRepository.findOne(stickerId, { relations: ['character'] });

        return sticker.character;
    }

    async getStickerItem(stickerId: string): Promise<LwpStickerCharacterItem> {
        const sticker = await this.stickerRepository.findOne(stickerId, { relations: ['item'] });

        return sticker.item;
    }

    async getStickerSchool(stickerId: string): Promise<LwpSchool> {
        const sticker = await this.stickerRepository.findOne(stickerId, { relations: ['school'] });

        return sticker.school;
    }

    getStickerUrl(fileName: string): string {
        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.uploadedStickers}/${fileName}`);
    }
}
