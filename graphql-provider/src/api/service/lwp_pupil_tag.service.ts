import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { LwpPupilTag } from '../entities/lwp_pupil_tag';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { LwpUser } from '../entities/user';
import {
    AddPupilTagsInPupilInput,
    CreateLwpSchoolPupilTagInput,
    ErrorStatusCodeEnum,
    OperationStatus,
    UpdateLwpSchoolPupilTagInput
} from '../model';

@Injectable()
export class LwpPupilTagService {
    constructor(
        @InjectRepository(LwpPupilTag)
        private lwpPupilTagRepository: Repository<LwpPupilTag>,
        @InjectRepository(LwpPupil)
        private lwpPupilRepository: Repository<LwpPupil>,
        @InjectRepository(LwpSchool)
        private lwpSchoolRepository: Repository<LwpSchool>,
        private shallowUserService: ShallowUserService
    ) {}

    public async createPupilTag(input: CreateLwpSchoolPupilTagInput, userId: string, schoolId: string): Promise<LwpPupilTag> {
        const pupilTag = new LwpPupilTag();
        const user = this.shallowUserService.newShallowUser(userId);

        pupilTag.name = input.name;
        pupilTag.color = input.color;
        pupilTag.logCreatedBy = user;
        pupilTag.logUpdatedBy = user;
        pupilTag.school = await this.lwpSchoolRepository.findOne(schoolId);

        if (input?.pupilIds?.length > 0) {
            pupilTag.pupils = await this.lwpPupilRepository.findByIds(input.pupilIds);
        }

        return await this.lwpPupilTagRepository.save(pupilTag);
    }

    public async updatePupilTag(input: UpdateLwpSchoolPupilTagInput, userId: string): Promise<LwpPupilTag> {
        const pupilTag = await this.lwpPupilTagRepository.findOne(input.id);

        if (!pupilTag) throw new HttpException('Pupil tag does not exist', ErrorStatusCodeEnum._535);

        const user = this.shallowUserService.newShallowUser(userId);

        pupilTag.name = input.name;
        pupilTag.color = input.color;
        pupilTag.logUpdatedBy = user;

        pupilTag.pupils = input?.pupilIds?.length > 0 ? await this.lwpPupilRepository.findByIds(input.pupilIds) : [];

        return await this.lwpPupilTagRepository.save(pupilTag);
    }

    public async getAllSchoolPupilTags(schoolId: string): Promise<LwpPupilTag[]> {
        if (!schoolId) throw new HttpException('Invalid token: school ID not found', ErrorStatusCodeEnum._535);

        return this.lwpPupilTagRepository.find({
            where: {
                school: schoolId
            },
            order: {
                logCreatedAt: 'DESC'
            }
        });
    }

    private async getOrCreateTag(input: AddPupilTagsInPupilInput, user: LwpUser): Promise<LwpPupilTag[]> {
        const tags = input?.tagIds?.length ? await this.lwpPupilTagRepository.findByIds(input.tagIds, { select: ['id'] }) : [];

        if (input.color && input.name) {
            const pupilTag = new LwpPupilTag();
            const school = await this.lwpSchoolRepository.findOne(input.schoolId, { select: ['id'] });

            pupilTag.name = input.name;
            pupilTag.color = input.color;
            pupilTag.logCreatedBy = user;
            pupilTag.logUpdatedBy = user;
            pupilTag.school = school;
            tags.push(await this.lwpPupilTagRepository.save(pupilTag));
        }

        return tags;
    }

    private async getPupilsWithTags(pupilIds: string[]): Promise<LwpPupil[]> {
        const pupils = await this.lwpPupilRepository.findByIds(pupilIds, { relations: ['tags'] });

        if (!pupils) throw new HttpException('Pupil not found', ErrorStatusCodeEnum._535);

        return pupils;
    }

    public async updatePupilTagsInPupils(input: AddPupilTagsInPupilInput, userId: string): Promise<boolean> {
        const user = this.shallowUserService.newShallowUser(userId);
        const pupils = await this.getPupilsWithTags(input.pupilIds);
        const tags = await this.getOrCreateTag(input, user);

        pupils.forEach((pupil) => {
            pupil.tags = tags;
        });

        await this.lwpPupilRepository.save(pupils);

        return true;
    }

    public async addPupilTagsInPupils(input: AddPupilTagsInPupilInput, userId: string): Promise<boolean> {
        const user = this.shallowUserService.newShallowUser(userId);
        const pupils = await this.getPupilsWithTags(input.pupilIds);
        const tags = await this.getOrCreateTag(input, user);

        pupils.forEach((pupil) => {
            pupil.tags.push(...tags);
        });

        await this.lwpPupilRepository.save(pupils);

        return true;
    }

    public async getPupilTagsByPupilId(pupilId: string): Promise<LwpPupilTag[]> {
        const pupilTags = await this.lwpPupilTagRepository
            .createQueryBuilder('tags')
            .innerJoin('tags.pupils', 'pupil', 'pupil.id = :pupilId', { pupilId })
            .orderBy('tags.name', 'ASC')
            .select(['tags.id', 'tags.name', 'tags.color'])
            .getMany();

        return pupilTags;
    }

    public async removeSchoolPupilTag(id: string, deletedBy: string): Promise<OperationStatus> {
        const res = await this.lwpPupilTagRepository.update(id, { deletedBy: this.shallowUserService.newShallowUser(deletedBy) });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }
}
