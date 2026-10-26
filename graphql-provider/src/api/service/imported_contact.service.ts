import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LwpUser } from '../entities/user';

@Injectable()
export class ImportedContactService {
    constructor(
        @InjectRepository(ImportedContact)
        private importedContactRepository: Repository<ImportedContact>
    ) {}

    public async getImportedContact(importedContactId: string): Promise<ImportedContact> {
        const importedContact = await this.importedContactRepository.findOne({
            where: { id: importedContactId }
        });

        return importedContact;
    }

    public async getImportedStudentContactsInfo(importedContactId: string): Promise<ImportedStudentContact[]> {
        const importedContact = await this.importedContactRepository.findOne({
            where: { id: importedContactId },
            relations: ['importedStudentContacts']
        });

        return importedContact?.importedStudentContacts ? importedContact?.importedStudentContacts : [];
    }

    public async getLwpUser(importedContactId: string): Promise<LwpUser> {
        const importedContact = await this.importedContactRepository
            .createQueryBuilder('importedContact')
            .leftJoinAndSelect('importedContact.lwpUser', 'lwpUser')
            .where('importedContact.id = :importedContactId', { importedContactId })
            .getOne();

        return importedContact?.lwpUser ? importedContact?.lwpUser : null;
    }

    public async getSchool(importedContactId: string): Promise<ImportedSchool> {
        const importedContact = await this.importedContactRepository
            .createQueryBuilder('importedContact')
            .leftJoinAndSelect('importedContact.school', 'school')
            .where('importedContact.id = :importedContactId', { importedContactId })
            .getOne();

        return importedContact?.school ? importedContact?.school : null;
    }
}
