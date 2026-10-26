import { HttpException } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';

import { WondeStudentsDetails } from '../dtos/WondeStudentDetails';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LwpPupil } from '../entities/pupil';
import { LwpSchool } from '../entities/school';
import { ErrorStatusCodeEnum } from '../model';
import { ImportedStudentService } from '../service/imported_student.service';

@Resolver(() => ImportedStudent)
export class ImportedStudentResolver {
    constructor(private importedStudentService: ImportedStudentService) {}

    @AuthorizeEndpoint([ImportedStudent, OpType.Read, 'importedStudentId'])
    @Query(() => ImportedStudent)
    async getImportedStudent(@Args('importedStudentId') importedStudentId: string): Promise<ImportedStudent> {
        const importedStudent = await this.importedStudentService.getImportedStudent(importedStudentId);

        if (!importedStudent) throw new HttpException('Wonde Student does not exist', ErrorStatusCodeEnum._535);

        return importedStudent;
    }

    @AuthorizeEndpoint(TeacherOnly, [LwpSchool, OpType.Read, 'id']) // the ID here is an LWP school ID, _not_ a Wonde school ID
    @Query(() => [WondeStudentsDetails])
    async getImportedSchoolPupils(@Args('id') id: string): Promise<WondeStudentsDetails[]> {
        return await this.importedStudentService.getImportedSchoolPupils(id);
    }

    @ResolveField(() => LwpPupil)
    async lwpPupil(@Parent() importedStudent: ImportedStudent): Promise<LwpPupil> {
        return await this.importedStudentService.getLwpPupil(importedStudent.id);
    }

    @ResolveField(() => [ImportedSchoolClass])
    async schoolClasses(@Parent() importedStudent: ImportedStudent): Promise<ImportedSchoolClass[]> {
        return await this.importedStudentService.getStudentSchoolClasses(importedStudent.id);
    }

    @ResolveField(() => [ImportedStudentContact])
    async importedStudentContacts(@Parent() importedStudent: ImportedStudent): Promise<ImportedStudentContact[]> {
        return await this.importedStudentService.getImportedStudentContacts(importedStudent.id);
    }

    @ResolveField(() => ImportedSchool)
    async school(@Parent() importedStudent: ImportedStudent): Promise<ImportedSchool> {
        return await this.importedStudentService.getWondeStudentSchool(importedStudent.id);
    }
}
