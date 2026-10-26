import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';

@Injectable()
export class ImportedStudentContactService {
    constructor(
        @InjectRepository(ImportedStudentContact)
        private importedStudentContactRepository: Repository<ImportedStudentContact>
    ) {}

    public async getImportedStudent(importedStudentContactId: string): Promise<ImportedStudent> {
        const importedStudentContact = await this.importedStudentContactRepository
            .createQueryBuilder('importedStudentContact')
            .leftJoinAndSelect('importedStudentContact.importedStudent', 'importedStudent')
            .where('importedStudentContact.id = :importedStudentContactId', { importedStudentContactId })
            .getOne();

        return importedStudentContact?.importedStudent ? importedStudentContact.importedStudent : null;
    }

    public async getImportedContact(importedStudentContactId: string): Promise<ImportedContact> {
        const importedStudentContact = await this.importedStudentContactRepository
            .createQueryBuilder('importedStudentContact')
            .leftJoinAndSelect('importedStudentContact.importedContact', 'importedContact')
            .where('importedStudentContact.id = :importedStudentContactId', { importedStudentContactId })
            .getOne();

        return importedStudentContact?.importedContact ? importedStudentContact.importedContact : null;
    }

    public async getWondeSchool(importedStudentContactId: string): Promise<ImportedSchool> {
        const importedStudentContact = await this.importedStudentContactRepository
            .createQueryBuilder('importedStudentContact')
            .leftJoinAndSelect('importedStudentContact.school', 'school')
            .where('importedStudentContact.id = :importedStudentContactId', { importedStudentContactId })
            .getOne();

        return importedStudentContact?.school ? importedStudentContact.school : null;
    }
}
