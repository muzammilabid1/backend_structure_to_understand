/* eslint-disable no-self-assign */
import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseEntity, Repository } from 'typeorm';

import { StaticLwpActivityTag } from '../entities/static_lwp_activity_tag';
import { LwpUser } from '../entities/user';
import { ErrorStatusCodeEnum, LwpActivityTagInput, LwpTagUpdateInput, OperationStatus } from '../model';
import { StaticLwpTagService } from './static_lwp_tag.service';

@Injectable()
export class StaticLwpActivityTagService extends StaticLwpTagService<StaticLwpActivityTag, LwpActivityTagInput, LwpTagUpdateInput> {
    constructor(
        @InjectRepository(StaticLwpActivityTag)
        private staticLwpTagsRepository: Repository<StaticLwpActivityTag>
    ) {
        super();
    }

    public async getTagsByIds(ids: string[]): Promise<StaticLwpActivityTag[]> {
        return await this.staticLwpTagsRepository.findByIds(ids);
    }

    public async addNewTag(input: LwpActivityTagInput, user: LwpUser): Promise<StaticLwpActivityTag> {
        const tag = new StaticLwpActivityTag();

        tag.name = input.name;
        tag.color = input.color;
        tag.logCreatedBy = user;
        tag.logUpdatedBy = user;

        return await this.staticLwpTagsRepository.save(tag);
    }

    public async allTags(): Promise<Omit<StaticLwpActivityTag, keyof BaseEntity>[]> {
        const tags = await this.staticLwpTagsRepository.find();

        if (tags?.length === 0) return [];

        const flattenedTags = tags.map((tag) => ({
            ...tag
        }));

        return flattenedTags;
    }

    public async getTagsForAdmin(): Promise<StaticLwpActivityTag[]> {
        return this.staticLwpTagsRepository.createQueryBuilder('tags').orderBy('tags.name', 'ASC').getMany();
    }

    public async getTag(id: string): Promise<StaticLwpActivityTag> {
        const tag = await this.staticLwpTagsRepository.findOne({ where: { id } });

        if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);

        tag.name = tag?.name;
        tag.color = tag?.color;

        return tag;
    }

    public async updateTag(input: LwpTagUpdateInput, user: LwpUser): Promise<StaticLwpActivityTag> {
        const tag = await this.staticLwpTagsRepository.findOne({ where: { id: input.id } });

        if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);
        tag.name = input.name;
        tag.color = input.color;
        tag.logUpdatedBy = user;

        return await this.staticLwpTagsRepository.save(tag);
    }

    public async deleteTag(id: string, deletedBy: LwpUser): Promise<OperationStatus> {
        const tag = await this.staticLwpTagsRepository.findOne({ where: { id } });

        if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);

        const res = await this.staticLwpTagsRepository.update({ id }, { deletedBy });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getActivityTags(activityId: string): Promise<StaticLwpActivityTag[]> {
        return await this.staticLwpTagsRepository
            .createQueryBuilder('tag')
            .leftJoinAndSelect('tag.activities', 'activity')
            .where('activity.id = :activityId', { activityId })
            .orderBy('tag.id', 'ASC')
            .getMany();
    }

    public async getTagsByActivityIds(activityIds: readonly string[]): Promise<StaticLwpActivityTag[][]> {
        const tags = await this.staticLwpTagsRepository
            .createQueryBuilder('tag')
            .leftJoinAndSelect('tag.activities', 'activity')
            .where('activity.id IN (:...activityIds)', { activityIds })
            .getMany();

        const tagsByActivityId = new Map<string, StaticLwpActivityTag[]>();

        activityIds.forEach((id) => tagsByActivityId.set(id, []));

        tags.forEach((tag) => {
            tag.activities.forEach((activity) => {
                if (tagsByActivityId.has(activity.id)) {
                    tagsByActivityId.get(activity.id).push(tag);
                }
            });
        });

        const result: StaticLwpActivityTag[][] = [];

        activityIds.forEach((id) => {
            result.push(tagsByActivityId.get(id));
        });

        return result;
    }
}
