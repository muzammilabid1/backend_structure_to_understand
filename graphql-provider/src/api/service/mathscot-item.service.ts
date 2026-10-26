import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { difference, sortBy } from 'lodash';
import { UserType } from 'src/auth/types/UserType';
import { LogParentPupilActions } from 'src/common/log_parent_pupil_action.actions';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { StaticLwpMathscotItem } from '../entities/mathscot_item';
import { LwpPupil } from '../entities/pupil';
import { LwpPupilMathscot } from '../entities/pupil_mathscot';
import {
    ErrorStatusCodeEnum,
    LogParentPupilActionInput,
    MergeMathscotItems,
    MergeMathscotItemsForChoicesInput,
    MergeMathscotItemsInput,
    MergeMathscotItemsLogInput,
    PupilMathscotsCharacter
} from '../model';
import { HelperService } from './helper.service';
import { LogParentPupilActionService } from './log_parent_pupil_action.service';

@Injectable()
export class MathscotItemService {
    readonly childMathscotImagePath = 'child-mathscot.png';
    readonly mathscot = this.helperService.getPublicUrl(`${appConstants.minioPaths.public.mathscotItems}/${this.childMathscotImagePath}`);

    constructor(
        @InjectRepository(StaticLwpMathscotItem)
        private mathscotItemRepository: Repository<StaticLwpMathscotItem>,
        @InjectRepository(LwpPupilMathscot)
        private pupilMathscotRepository: Repository<LwpPupilMathscot>,
        @InjectRepository(LwpPupil)
        private pupilRepository: Repository<LwpPupil>,
        private httpService: HttpService,
        private helperService: HelperService,
        private logParentPupilActionService: LogParentPupilActionService
    ) {}

    public getMathscotUrl(): string {
        return this.mathscot;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getBufferFromUrl(url: string): any {
        return this.httpService.get(url, { responseType: 'arraybuffer' });
    }

    public async getMathscotItemsByIds(ids: number[]): Promise<StaticLwpMathscotItem[]> {
        return await this.mathscotItemRepository.findByIds(ids);
    }

    /**
     * Returns all the tshirt mathscot items in the database.
     *
     * @return {Promise<StaticLwpMathscotItem[]>} the tshirts
     * @memberof MathscotItemService
     */
    public async getTshirts(): Promise<StaticLwpMathscotItem[]> {
        return await this.mathscotItemRepository.find({ category: 'TShirt', theme: 'Base' });
    }

    public checkFileExists(url: string): Promise<boolean> {
        return this.httpService
            .head(url)
            .toPromise()
            .then(
                () => true,
                () => false
            );
    }

    // Ids should match
    async validateGetItems(ids: string[]): Promise<StaticLwpMathscotItem[]> {
        const existingItems = await this.mathscotItemRepository.findByIds(ids);
        const existingIds = existingItems.map((e) => e.id);
        const nonExitingIds = difference(ids, existingIds) ?? [];

        if (nonExitingIds && nonExitingIds?.length > 0) {
            throw new HttpException(`Invalid id(s) ${nonExitingIds.join(', ')}`, ErrorStatusCodeEnum._535);
        }

        return existingItems;
    }

    async allMathscotItem(): Promise<StaticLwpMathscotItem[]> {
        const mathscotItems = await this.mathscotItemRepository.find();

        return mathscotItems;
    }

    async allMathscotThemes(): Promise<string[]> {
        const mathscotThemes = [];
        const mathscotItems = await this.mathscotItemRepository
            .createQueryBuilder('mathscotItem')
            .select('mathscotItem.theme')
            .distinctOn(['mathscotItem.theme'])
            .getMany();

        if (mathscotItems?.length > 0) {
            for (const mathscotItem of mathscotItems) {
                mathscotThemes.push(mathscotItem?.theme);
            }
        }

        return mathscotThemes;
    }

    async getMathscotItem(itemName: string): Promise<StaticLwpMathscotItem> {
        const mathscotItem = await this.mathscotItemRepository.findOne({ where: { name: itemName } });

        if (!mathscotItem) throw new HttpException(`Mathscot item not found.`, ErrorStatusCodeEnum._535);

        return mathscotItem;
    }

    // In the items, those appearing first is considered the items that needs to be added and only that is taken for resolving conflict
    public resolveCategory(items: StaticLwpMathscotItem[]): StaticLwpMathscotItem[] {
        const [current, ...restItems] = items ?? [];

        if (!current) {
            return [];
        } else {
            const updatedRestItems = (restItems ?? []).filter(
                (r) =>
                    current.category !== r.category &&
                    !(r.conflictingCategories ?? []).includes(current.category) &&
                    !(current.conflictingCategories ?? []).includes(r.category)
            );

            return [current, ...(updatedRestItems ?? [])];
        }
    }

    public async saveItemsInPupil(
        pupilId: string,
        mathscotItemsIds: string[],
        userId: string,
        userType: UserType,
        logInput: MergeMathscotItemsLogInput,
        periodIndex?: number
    ): Promise<LwpPupilMathscot> {
        const pupil = await this.pupilRepository
            .createQueryBuilder('pupil')
            .leftJoin('pupil.school', 'school')
            .leftJoin('school.curentPeriod', 'schoolPeriod')
            .where('pupil.id = :pupilId', { pupilId })
            .select(['schoolPeriod.index as "schoolPeriodIndex"'])
            .getRawOne<{ schoolPeriodIndex: number }>();

        const mathscotPeriodIndex = periodIndex || pupil?.schoolPeriodIndex;

        const pupilMathscot = await this.pupilMathscotRepository
            .createQueryBuilder('pupilMathscot')
            .leftJoin('pupilMathscot.pupil', 'pupil')
            .leftJoin('pupilMathscot.period', 'period')
            .where('pupil.id = :pupilId', { pupilId })
            .andWhere('period.index = :mathscotPeriodIndex', { mathscotPeriodIndex })
            .getOne();

        if (!pupilMathscot)
            throw new HttpException(`Pupil mathscot not found. Please create your mathscot first.`, ErrorStatusCodeEnum._535);

        if (userType !== UserType.TEACHER) {
            const logParentPupilActionInput = new LogParentPupilActionInput();

            logParentPupilActionInput.actionId = LogParentPupilActions.mathscot_saved.id;
            logParentPupilActionInput.parentId = userId;
            logParentPupilActionInput.pupilId = pupilId;
            logParentPupilActionInput.userId = userId;
            logParentPupilActionInput.param1 = logInput?.staticActivityId;
            logParentPupilActionInput.param2 = logInput?.activityId;
            logParentPupilActionInput.param3 = logInput?.order;

            await this.logParentPupilActionService.addLogParentPupilAction(logParentPupilActionInput);
        }

        pupilMathscot.items = mathscotItemsIds;

        return await this.pupilMathscotRepository.save(pupilMathscot);
    }

    public async addMathscotIdsToInput(input: MergeMathscotItemsInput, id: string): Promise<MergeMathscotItems> {
        const { ids, pupilId, character, colour } = input;

        return await this.getMathscotUrlsForChoices({
            ids: [id, ...ids.map((id) => id.toString())],
            pupilId: pupilId,
            itemId: id,
            character,
            colour
        });
    }

    public getChildMathscotImagePathUrl(character: PupilMathscotsCharacter, imagePath: string): string {
        return this.helperService.getPublicUrl(`${appConstants.minioPaths.public.pupilMathscots}/${character}/${imagePath}`);
    }

    public async getMathscotUrlsForChoices(input: MergeMathscotItemsForChoicesInput): Promise<MergeMathscotItems> {
        const { ids, character, colour, itemId } = input;
        const items = await this.validateGetItems(ids);
        const inputOrder = ids.map((i) => items.find((it) => it.id === i));
        const validatedItems = this.resolveCategory(inputOrder);
        const sortedById = sortBy(validatedItems, (item) => parseInt(item.id));

        const specifiedItem = await this.mathscotItemRepository.findOneOrFail({ id: itemId });

        const sortedByZIndex = sortBy(sortedById, (item) => parseInt(item.zIndex));

        const newsortedByZIndex = [...sortedByZIndex, { id: character }, { id: colour }];
        const bigImageFileName = (size: number): string => newsortedByZIndex.map(({ id }) => id).join('_') + `_${size}.png`;
        const { bigImage } = appConstants.media;

        const bigImageUrl = this.helperService.getMathscotProxyUrl(bigImageFileName(bigImage));
        const thumbnailImageUrl = this.helperService.getPublicUrl(
            `${appConstants.minioPaths.public.pupilMathscotIcons}/${specifiedItem.imageIconPath}`
        );

        return {
            itemIds: sortedByZIndex.map((i) => i.id),
            bigImage: bigImageUrl,
            thumbnailImage: thumbnailImageUrl
        };
    }

    public async getMathscotUrlsByInputWithoutSave(input: MergeMathscotItemsInput): Promise<MergeMathscotItems> {
        const { ids: ids_untyped, character, colour } = input;
        const ids = ids_untyped.map((id) => id.toString());
        const items = await this.validateGetItems(ids);
        const inputOrder = ids.map((i) => items.find((it) => it.id === i));
        const validatedItems = this.resolveCategory(inputOrder);
        const sortedById = sortBy(validatedItems, 'id');

        const sortedByZIndex = sortBy(sortedById, (item) => parseInt(item.zIndex));

        const newsortedByZIndex = [...sortedByZIndex, { id: character }, { id: colour }];
        const fileName = (size: number): string => newsortedByZIndex.map(({ id }) => id).join('_') + `_${size}.png`;
        const { thumbnailSize, bigImage } = appConstants.media;

        const bigImageUrl = this.helperService.getMathscotProxyUrl(fileName(bigImage));
        const thumbnailImageUrl = this.helperService.getMathscotProxyUrl(fileName(thumbnailSize));

        return {
            itemIds: sortedByZIndex.map((i) => i.id),
            bigImage: bigImageUrl,
            thumbnailImage: thumbnailImageUrl
        };
    }

    public async getMathscotUrlsByInput(
        input: MergeMathscotItemsInput,
        userId: string,
        userType: UserType,
        logInput?: MergeMathscotItemsLogInput,
        periodIndex?: number
    ): Promise<MergeMathscotItems> {
        const { pupilId } = input;
        const { itemIds, bigImage, thumbnailImage } = await this.getMathscotUrlsByInputWithoutSave(input);

        await this.saveItemsInPupil(pupilId, itemIds, userId, userType, logInput, periodIndex);

        return { itemIds, bigImage, thumbnailImage };
    }
}
