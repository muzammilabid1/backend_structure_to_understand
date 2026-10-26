import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { ImportedStudentContactService } from '../service/imported_student_contact.service';

@Resolver(() => ImportedStudentContact)
export class ImportedStudentContactResolver {
    constructor(private importedStudentContactService: ImportedStudentContactService) {}

    @ResolveField(() => ImportedStudent)
    async importedStudent(@Parent() importedStudentContact: ImportedStudentContact): Promise<ImportedStudent> {
        return await this.importedStudentContactService.getImportedStudent(importedStudentContact.id);
    }

    @ResolveField(() => ImportedContact)
    async importedContact(@Parent() importedStudentContact: ImportedStudentContact): Promise<ImportedContact> {
        return await this.importedStudentContactService.getImportedContact(importedStudentContact.id);
    }

    @ResolveField(() => ImportedSchool)
    async school(@Parent() importedStudentContact: ImportedStudentContact): Promise<ImportedSchool> {
        return await this.importedStudentContactService.getWondeSchool(importedStudentContact.id);
    }
}
