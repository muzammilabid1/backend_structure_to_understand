import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { LwpSchoolStaticTags } from '../entities/lwp_school_static_tags';
import { LwpSchool } from '../entities/school';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';
import { CreateLwpSchoolTagInput, ErrorStatusCodeEnum, OperationStatus, UpdateLwpSchoolTagInput } from '../model';
import { LwpSchoolStaticTagService } from './lwp_school_static_tag.service';
import { StaticLwpTagService } from './static_lwp_tag.service';

@Injectable()
export class StaticLwpSchoolTagService extends StaticLwpTagService<StaticLwpSchoolTag, CreateLwpSchoolTagInput, UpdateLwpSchoolTagInput> {
    constructor(
        @InjectRepository(LwpSchool)
        private schoolRepository: Repository<LwpSchool>,
        @InjectRepository(StaticLwpSchoolTag)
        private staticLwpTopicSchoolRepository: Repository<StaticLwpSchoolTag>,
        @InjectRepository(LwpSchoolStaticTags)
        private lwpSchoolTagRepository: Repository<LwpSchoolStaticTags>,
        private lwpSchoolStaticTagService: LwpSchoolStaticTagService
    ) {
        super();
    }

    public async getTagsByIds(ids: string[]): Promise<StaticLwpSchoolTag[]> {
        return await this.staticLwpTopicSchoolRepository.findByIds(ids);
    }

    public async addNewTag(input: CreateLwpSchoolTagInput, user: LwpUser): Promise<StaticLwpSchoolTag> {
        const tag = new StaticLwpSchoolTag();

        tag.name = input.name;
        tag.color = input.color;
        tag.logCreatedBy = user;
        tag.logUpdatedBy = user;
        const createdTag = await this.staticLwpTopicSchoolRepository.save(tag);

        await this.lwpSchoolStaticTagService.addSchoolsInTag(tag, input.schoolIds, user);

        return createdTag;
    }

    public async getTagsForAdmin(): Promise<StaticLwpSchoolTag[]> {
        return await this.staticLwpTopicSchoolRepository.createQueryBuilder('tags').orderBy('tags.name', 'ASC').getMany();
    }

    public async updateTag(input: UpdateLwpSchoolTagInput, updatedBy: LwpUser): Promise<StaticLwpSchoolTag> {
        try {
            const tag = await this.staticLwpTopicSchoolRepository.findOne({ where: { id: input.id } });

            if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);

            await this.lwpSchoolStaticTagService.updateSchoolsInTag(tag, input.schoolIds, updatedBy);

            tag.name = input.name;
            tag.color = input.color;
            tag.logUpdatedBy = updatedBy;

            return await this.staticLwpTopicSchoolRepository.save(tag);
        } catch (err) {
            if (err?.constraint?.includes('idx_unique_school_isprogramtag')) {
                throw new HttpException(
                    'Some schools are already linked to a partner program through another tag. Each school can only have one tag linked to a partner program. Please adjust your selection',
                    ErrorStatusCodeEnum._535
                );
            }

            throw err; // Re-throw if it's an unexpected error
        }
    }

    public async deleteTag(id: string, deletedBy: LwpUser): Promise<OperationStatus> {
        const tag = await this.staticLwpTopicSchoolRepository.findOne({ where: { id } });

        if (!tag) throw new HttpException('Tag does not exist', ErrorStatusCodeEnum._535);
        const res = await this.staticLwpTopicSchoolRepository.update({ id }, { deletedBy });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    private getSchoolsQueryBuilder(tagId: string): SelectQueryBuilder<LwpSchool> {
        return this.schoolRepository
            .createQueryBuilder('school')
            .leftJoin('school.schoolTags', 'schoolTags')
            .leftJoin('schoolTags.tag', 'tag')
            .where('tag.id = :tagId', { tagId })
            .orderBy('school.schoolName', 'ASC');
    }

    public async getSchoolsByTagId(tagId: string): Promise<LwpSchool[]> {
        return await this.getSchoolsQueryBuilder(tagId).getMany();
    }

    public async getSchoolsCountByTagId(tagId: string): Promise<number> {
        return await this.getSchoolsQueryBuilder(tagId).getCount();
    }
}
