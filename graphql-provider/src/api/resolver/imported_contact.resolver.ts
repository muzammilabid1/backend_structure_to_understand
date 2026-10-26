import { HttpException } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LwpUser } from '../entities/user';
import { ErrorStatusCodeEnum } from '../model';
import { ImportedContactService } from '../service/imported_contact.service';

@Resolver(() => ImportedContact)
export class ImportedContactResolver {
    constructor(private importedContactService: ImportedContactService) {}

    @AuthorizeEndpoint([ImportedContact, OpType.Read, 'importedContactId'])
    @Query(() => ImportedContact)
    async getImportedContact(@Args('importedContactId') importedContactId: string): Promise<ImportedContact> {
        const importedContact = await this.importedContactService.getImportedContact(importedContactId);

        if (!importedContact) throw new HttpException('Wonde Contact does not exist', ErrorStatusCodeEnum._535);

        return importedContact;
    }

    @ResolveField(() => LwpUser)
    async lwpUser(@Parent() importedContact: ImportedContact): Promise<LwpUser> {
        return await this.importedContactService.getLwpUser(importedContact.id);
    }

    @ResolveField(() => [ImportedStudentContact])
    async importedStudentContacts(@Parent() importedContact: ImportedContact): Promise<ImportedStudentContact[]> {
        return await this.importedContactService.getImportedStudentContactsInfo(importedContact.id);
    }

    @ResolveField(() => ImportedSchool)
    async school(@Parent() importedContact: ImportedContact): Promise<ImportedSchool> {
        return await this.importedContactService.getSchool(importedContact.id);
    }
}
