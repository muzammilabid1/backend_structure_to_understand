import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LwpSchoolStaticTags } from '../entities/lwp_school_static_tags';
import { LwpSchool } from '../entities/school';
import { StaticLwpSchoolTag } from '../entities/static_lwp_school_tag';
import { LwpUser } from '../entities/user';

@Injectable()
export class LwpSchoolStaticTagService {
    constructor(
        @InjectRepository(LwpSchoolStaticTags)
        private lwpSchoolTagRepository: Repository<LwpSchoolStaticTags>
    ) {}

    public async addSchoolsInTag(tag: StaticLwpSchoolTag, schoolIds: string[], user: LwpUser): Promise<void> {
        const schoolTags = schoolIds.map((schoolId) => {
            const newTag = new LwpSchoolStaticTags();

            newTag.school = { id: schoolId } as LwpSchool;
            newTag.tag = tag;
            newTag.logCreatedBy = user;
            newTag.logUpdatedBy = user;

            return newTag;
        });

        await this.lwpSchoolTagRepository.save(schoolTags);
    }

    public async updateSchoolsInTag(tag: StaticLwpSchoolTag, schoolIds: string[], user: LwpUser): Promise<void> {
        const existingSchoolTags = await this.lwpSchoolTagRepository.find({
            where: {
                tag: tag.id
            },
            relations: ['school']
        });

        const needToRemove = existingSchoolTags.filter((tag) => !schoolIds.includes(tag.school.id));

        if (needToRemove.length) await this.lwpSchoolTagRepository.remove(needToRemove);

        const needToUpdateOrAdd = schoolIds.filter((schoolId) => !existingSchoolTags.some((schoolTag) => schoolTag.school.id === schoolId));

        const schoolTags = needToUpdateOrAdd.map((schoolId) => {
            const newTag = new LwpSchoolStaticTags();

            newTag.school = { id: schoolId } as LwpSchool;
            newTag.tag = tag;
            newTag.logCreatedBy = user;
            newTag.logUpdatedBy = user;

            return newTag;
        });

        await this.lwpSchoolTagRepository.save(schoolTags);
    }

    public async addTagsInSchool(school: LwpSchool, tagIds: string[], updatedBy: LwpUser): Promise<void> {
        const existingSchoolTags = await this.lwpSchoolTagRepository.find({
            where: {
                school: school.id
            },
            relations: ['tag']
        });

        const needToRemove = existingSchoolTags.filter((tag) => !tagIds.includes(tag?.tag?.id));

        if (needToRemove.length) await this.lwpSchoolTagRepository.remove(needToRemove);

        const needToUpdateOrAdd = tagIds.filter((tagId) => !existingSchoolTags.some((tag) => tag?.tag?.id === tagId));

        const schoolTags = needToUpdateOrAdd.map((tagId) => {
            const newTag = new LwpSchoolStaticTags();

            newTag.school = school;
            newTag.tag = { id: tagId } as StaticLwpSchoolTag;
            newTag.logCreatedBy = updatedBy;
            newTag.logUpdatedBy = updatedBy;

            return newTag;
        });

        await this.lwpSchoolTagRepository.save(schoolTags);
    }
}
