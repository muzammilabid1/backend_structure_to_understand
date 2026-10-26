import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WondeStudentsDetails } from '../dtos/WondeStudentDetails';
import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LwpPupil } from '../entities/pupil';

@Injectable()
export class ImportedStudentService {
    constructor(
        @InjectRepository(ImportedStudent)
        private importedStudentRepository: Repository<ImportedStudent>
    ) {}

    public async getImportedStudent(importedStudentId: string): Promise<ImportedStudent> {
        const importedStudent = await this.importedStudentRepository.findOne({
            where: { id: importedStudentId }
        });

        return importedStudent;
    }

    public async getLwpPupil(importedStudentId: string): Promise<LwpPupil> {
        const importedStudent = await this.importedStudentRepository.findOne({
            where: { id: importedStudentId },
            relations: ['lwpPupil']
        });

        return importedStudent?.lwpPupil ? importedStudent?.lwpPupil : null;
    }

    public async getStudentSchoolClasses(importedStudentId: string): Promise<ImportedSchoolClass[]> {
        const importedStudent = await this.importedStudentRepository.findOne({
            where: { id: importedStudentId },
            relations: ['schoolClasses']
        });

        return importedStudent?.schoolClasses?.length > 0 ? importedStudent?.schoolClasses : [];
    }

    public async getImportedStudentContacts(importedStudentId: string): Promise<ImportedStudentContact[]> {
        const importedStudent = await this.importedStudentRepository.findOne({
            where: { id: importedStudentId },
            relations: ['importedStudentContacts']
        });

        return importedStudent?.importedStudentContacts ? importedStudent?.importedStudentContacts : [];
    }

    public async getWondeStudentSchool(importedStudentId: string): Promise<ImportedSchool> {
        const importedStudent = await this.importedStudentRepository.findOne({
            where: { id: importedStudentId },
            relations: ['school']
        });

        return importedStudent?.school ? importedStudent?.school : null;
    }

    public async getImportedSchoolPupils(schoolId: string): Promise<WondeStudentsDetails[]> {
        const wondeStudentsData = await this.importedStudentRepository
            .createQueryBuilder('importedStudent')
            .leftJoin('importedStudent.school', 'importedSchool')
            .leftJoin('importedSchool.lwpSchool', 'lwpSchool')
            .leftJoin('lwpSchool.curentPeriod', 'lwpSchoolPeriod')
            .leftJoin('importedStudent.schoolClasses', 'importedClasses')
            .leftJoin('importedClasses.period', 'importedClassPeriod')
            .leftJoin('importedStudent.importedStudentContacts', 'importedStudentContact')
            .leftJoin('importedStudentContact.importedContact', 'importedContact')
            .where('lwpSchool.id = :schoolId', { schoolId })
            .andWhere('importedClassPeriod.index >= lwpSchoolPeriod.index')
            .select([
                'importedStudent.id',
                'importedStudent.forename',
                'importedStudent.surname',
                'importedStudent.details',
                'importedClasses.name',
                'importedStudentContact.id',
                'importedContact.forename',
                'importedContact.surname',
                'importedContact.email',
                'importedContact.phoneNumber'
            ])
            .getMany();

        const wondeStudentsDetails: WondeStudentsDetails[] = [];

        if (wondeStudentsData.length > 0) {
            for (const importedStudent of wondeStudentsData) {
                const importedContacts: ImportedContact[] = [];
                const wondeStudentDetails = new WondeStudentsDetails();

                importedStudent?.importedStudentContacts.map((wsc) => {
                    if (wsc?.importedContact) importedContacts.push(wsc?.importedContact);
                });

                wondeStudentDetails.id = importedStudent?.id;
                wondeStudentDetails.forename = importedStudent?.forename;
                wondeStudentDetails.surname = importedStudent?.surname;
                wondeStudentDetails.importedClassName = importedStudent?.schoolClasses?.find((wsc) => wsc.name)?.name;
                wondeStudentDetails.importedClassYearGroup = JSON.parse(importedStudent?.details)?.import_nc_year;
                wondeStudentDetails.importedContacts = importedContacts;

                wondeStudentsDetails.push(wondeStudentDetails);
            }
        }

        return wondeStudentsDetails;
    }
}
