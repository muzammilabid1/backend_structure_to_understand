import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpYearGroup } from '../entities/year_group';

@Injectable()
export class ImportedSchoolClassService {
    constructor(
        @InjectRepository(ImportedSchoolClass)
        private importedSchoolClassRepository: Repository<ImportedSchoolClass>
    ) {}

    public async getImportedSchoolClass(importedSchoolClassId: string): Promise<ImportedSchoolClass> {
        const importedSchoolClass = await this.importedSchoolClassRepository.findOne({
            where: { id: importedSchoolClassId }
        });

        return importedSchoolClass;
    }

    public async getLwpSchoolClasses(importedSchoolClassId: string): Promise<LwpSchoolClass> {
        const importedSchoolClass = await this.importedSchoolClassRepository.findOne({
            where: { id: importedSchoolClassId },
            relations: ['lwpSchoolClass']
        });

        return importedSchoolClass.lwpSchoolClass;
    }

    public async getWondeSchoolClassYearGroup(importedSchoolClassId: string): Promise<StaticLwpYearGroup> {
        const importedSchoolClass = await this.importedSchoolClassRepository.findOne({
            where: { id: importedSchoolClassId },
            relations: ['yearGroup']
        });

        return importedSchoolClass.yearGroup;
    }

    public async getImportedClassPupils(importedSchoolClassId: string): Promise<ImportedStudent[]> {
        const importedSchoolClass = await this.importedSchoolClassRepository
            .createQueryBuilder('importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.students', 'students')
            .where('importedSchoolClass.id = :id', { id: importedSchoolClassId })
            .orderBy('students.forename', 'ASC')
            .getOne();

        return importedSchoolClass?.students ? importedSchoolClass?.students : [];
    }

    public async getWondeClassSchool(importedSchoolClassId: string): Promise<ImportedSchool> {
        const importedSchoolClass = await this.importedSchoolClassRepository
            .createQueryBuilder('importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.school', 'school')
            .where('importedSchoolClass.id = :id', { id: importedSchoolClassId })
            .getOne();

        return importedSchoolClass?.school ? importedSchoolClass?.school : null;
    }

    public async getWondeClassPeriod(importedSchoolClassId: string): Promise<StaticLwpPeriod> {
        const importedSchoolClass = await this.importedSchoolClassRepository
            .createQueryBuilder('importedSchoolClass')
            .leftJoinAndSelect('importedSchoolClass.period', 'period')
            .where('importedSchoolClass.id = :id', { id: importedSchoolClassId })
            .getOne();

        return importedSchoolClass?.period ? importedSchoolClass?.period : null;
    }
}
