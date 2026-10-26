import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload';
import { ContentStatus, UserType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { appConstants } from 'src/constants';
import { Repository } from 'typeorm';

import { CreateStaticLwpFeatureTooltipInput } from '../dtos/CreateStaticLwpFeatureTooltipInput';
import { UpdateStaticLwpFeatureTooltipInput } from '../dtos/UpdateStaticLwpFeatureTooltipInput';
import { StaticLwpFeatureTooltip } from '../entities/static_lwp_feature_tooltip';
import { ErrorStatusCodeEnum, OperationStatus } from '../model';
import { HelperService } from './helper.service';

@Injectable()
export class StaticLwpFeatureTooltipService {
    constructor(
        @InjectRepository(StaticLwpFeatureTooltip)
        private tooltipRepository: Repository<StaticLwpFeatureTooltip>,
        private shallowUserService: ShallowUserService,
        private helperService: HelperService
    ) {}

    async allFeatureTooltips(): Promise<StaticLwpFeatureTooltip[]> {
        return await this.tooltipRepository.find({ order: { order: 'ASC' } });
    }

    async getUnseenFeatureTooltips(userId: string, userType: UserType): Promise<StaticLwpFeatureTooltip[]> {
        const query = `
            SELECT t.id, t."targetId", t.message, t."order", t."imageUrl"
            FROM static_lwp_feature_tooltip t
            WHERE t."userTypes" @> $1::jsonb
            AND t.status = '${ContentStatus.PUBLISHED}'
            AND NOT EXISTS (
                SELECT 1
                FROM lwp_user_tooltip_history h
                WHERE h."featureTooltipId" = t.id
                AND h."userId" = $2
            )
            ORDER BY t."order" ASC
    `;

        return await this.tooltipRepository.query(query, [JSON.stringify([userType]), userId]);
    }

    async getFeatureTooltip(id: string): Promise<StaticLwpFeatureTooltip> {
        return await this.tooltipRepository.findOne({
            where: { id }
        });
    }

    async createFeatureTooltip(
        createTooltipInput: CreateStaticLwpFeatureTooltipInput,
        file: FileUpload[],
        userId: string
    ): Promise<StaticLwpFeatureTooltip> {
        const user = this.shallowUserService.newShallowUser(userId);
        const tooltip = new StaticLwpFeatureTooltip();

        tooltip.name = createTooltipInput.name;
        tooltip.targetId = createTooltipInput.targetId;
        tooltip.order = createTooltipInput.order;
        tooltip.userTypes = createTooltipInput.userTypes;
        tooltip.message = createTooltipInput.message;
        tooltip.status = createTooltipInput.status;
        tooltip.logCreatedBy = user;
        tooltip.logUpdatedBy = user;

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);

            const filename = `${new Date().getTime()}_${fileUploads[0].filename}`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.featureTooltipIcon}/${filename}`, fileUploads[0], true);
            tooltip.imageUrl = filename;
        }

        try {
            return await this.tooltipRepository.save(tooltip);
        } catch (error) {
            if (error?.code === '23505') {
                // PostgreSQL unique violation error code
                throw new HttpException('Target ID must be unique', ErrorStatusCodeEnum._535);
            }

            throw new HttpException(`${error}`, ErrorStatusCodeEnum._535);
        }
    }

    async updateFeatureTooltip(
        updateTooltipInput: UpdateStaticLwpFeatureTooltipInput,
        file: FileUpload[],
        userId: string
    ): Promise<StaticLwpFeatureTooltip> {
        const user = this.shallowUserService.newShallowUser(userId);
        const tooltip = await this.tooltipRepository.findOne({ where: { id: updateTooltipInput.id } });

        if (!tooltip) throw new HttpException('Tooltip not found', ErrorStatusCodeEnum._535);

        tooltip.name = updateTooltipInput.name;
        tooltip.targetId = updateTooltipInput.targetId;
        tooltip.order = updateTooltipInput.order;
        tooltip.userTypes = updateTooltipInput.userTypes;
        tooltip.message = updateTooltipInput.message;
        tooltip.status = updateTooltipInput.status;
        tooltip.logUpdatedBy = user;

        if (!updateTooltipInput.hasImage && tooltip.imageUrl) {
            tooltip.imageUrl = null;
        }

        if (file && file.filter((f) => f).length) {
            const fileUploads = await Promise.all(file);

            const filename = `${new Date().getTime()}_${fileUploads[0].filename}`;

            await this.helperService.uploadFile(`${appConstants.minioPaths.public.featureTooltipIcon}/${filename}`, fileUploads[0], true);
            tooltip.imageUrl = filename;
        }

        try {
            return await this.tooltipRepository.save(tooltip);
        } catch (error) {
            if (error?.code === '23505') {
                // PostgreSQL unique violation error code
                throw new HttpException('Target ID must be unique', ErrorStatusCodeEnum._535);
            }

            throw new HttpException(`${error}`, ErrorStatusCodeEnum._535);
        }
    }

    async softDeleteFeatureTooltip(id: string, userId: string): Promise<OperationStatus> {
        const res = await this.tooltipRepository.update(id, {
            deletedBy: this.shallowUserService.newShallowUser(userId)
        });

        if (res['affected'] > 0) {
            return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        } else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
