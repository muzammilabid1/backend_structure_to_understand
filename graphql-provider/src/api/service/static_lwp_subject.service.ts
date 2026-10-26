import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubjectProgrammeType } from 'lwp-shared';
import { ShallowUserService } from 'src/auth/service/shallowuser.service';
import { Repository } from 'typeorm';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { ErrorStatusCodeEnum, OperationStatus, UpdateSubjectInput } from '../model';

@Injectable()
export class StaticLwpSubjectService {
    constructor(
        @InjectRepository(StaticLwpSubject)
        private lwpSubjectRepository: Repository<StaticLwpSubject>,
        private shallowUserService: ShallowUserService
    ) {}

    public async addNewSubject(subjectName: string, programmeType: SubjectProgrammeType, userId: string): Promise<StaticLwpSubject> {
        const user = this.shallowUserService.newShallowUser(userId);

        const subject = new StaticLwpSubject();

        subject.name = subjectName.trim();
        subject.programmeType = programmeType;

        subject.logCreatedBy = user;

        return this.lwpSubjectRepository.save(subject);
    }

    public async updateSubject(input: UpdateSubjectInput, userId: string): Promise<StaticLwpSubject> {
        const subject = await this.lwpSubjectRepository.findOne(input.id);

        if (!subject) throw new HttpException('Subject does not exist', ErrorStatusCodeEnum._535);

        const user = this.shallowUserService.newShallowUser(userId);

        subject.name = input.subjectName.trim();
        subject.programmeType = input.programmeType;

        subject.logUpdatedBy = user;

        return this.lwpSubjectRepository.save(subject);
    }

    public async removeSubject(id: string, deletedBy: string): Promise<OperationStatus> {
        const res = await this.lwpSubjectRepository.update(id, {
            deletedBy: this.shallowUserService.newShallowUser(deletedBy)
        });

        if (res['affected'] > 0) return { status: 'ok', msg: `${res['affected']} records deleted` } as OperationStatus;
        else return { status: 'fail', msg: 'No records deleted' } as OperationStatus;
    }

    public async getSubjectsForAdmin(): Promise<StaticLwpSubject[]> {
        return this.lwpSubjectRepository.createQueryBuilder('subject').orderBy('subject.name', 'ASC').getMany();
    }

    public async getAllSubjects(): Promise<StaticLwpSubject[]> {
        return await this.lwpSubjectRepository.find();
    }

    public async getSubjectById(id: string): Promise<StaticLwpSubject | null> {
        return this.lwpSubjectRepository.findOne(id, { select: ['id', 'name'] });
    }
}
