import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { OpType } from 'src/auth/types/OpType';
import { DataImportService } from 'src/data-import/service/data-import.service';

import { ImportedSchoolCheckResult } from '../dtos/ImportedSchoolCheckResult';
import { ImportedContact } from '../entities/imported_contact';
import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { ImportedStudentContact } from '../entities/imported_student_contact';
import { LwpSchool } from '../entities/school';
import { StaticLwpPeriod } from '../entities/static_period';
import { ImportedSchoolService } from '../service/imported_school.service';

@Resolver(() => ImportedSchool)
export class ImportedSchoolResolver {
    constructor(
        private importedSchoolService: ImportedSchoolService,
        private dataImportService: DataImportService
    ) {}

    private async getServiceForSchool(lwpSchoolId: string): Promise<typeof this.dataImportService | typeof this.importedSchoolService> {
        const isDataImportReviewRequired = await this.dataImportService.isReviewRequiredForSchool(lwpSchoolId);

        return isDataImportReviewRequired ? this.dataImportService : this.importedSchoolService;
    }

    @AuthorizeEndpoint(AdminOnly, [LwpSchool, OpType.Write, 'lwpSchoolId']) // the ID here is an LWP school ID, _not_ a Wonde school ID
    @Mutation(() => [String])
    async importSchoolData(
        @Args('lwpSchoolId') lwpSchoolId: string,
        @Args({ name: 'file', type: () => GraphQLUpload }) importFile: FileUpload
    ): Promise<string[]> {
        const service = await this.getServiceForSchool(lwpSchoolId);

        return service.importSchoolData(lwpSchoolId, importFile);
    }

    @AuthorizeEndpoint(AdminOnly, [LwpSchool, OpType.Write, 'lwpSchoolId']) // the ID here is an LWP school ID, _not_ a Wonde school ID
    @Mutation(() => Boolean)
    async promoteProposedSchool(@Args('lwpSchoolId') lwpSchoolId: string): Promise<boolean> {
        const service = await this.getServiceForSchool(lwpSchoolId);

        return service.promoteProposedSchool(lwpSchoolId);
    }

    @AuthorizeEndpoint(AdminOnly, [LwpSchool, OpType.Read, 'lwpSchoolId']) // the ID here is an LWP school ID, _not_ a Wonde school ID
    @Query(() => ImportedSchoolCheckResult)
    async checkImportedSchoolData(@Args('lwpSchoolId') lwpSchoolId: string): Promise<ImportedSchoolCheckResult> {
        const service = await this.getServiceForSchool(lwpSchoolId);

        return {
            parentChanges: await service.warnOnParentChange(lwpSchoolId),
            missedMatches: await service.warnOnMissedMatch(lwpSchoolId)
        };
    }

    @ResolveField(() => [ImportedSchoolClass])
    async classes(@Parent() importedSchool: ImportedSchool): Promise<ImportedSchoolClass[]> {
        return await this.importedSchoolService.getImportedSchoolClasses(importedSchool.id);
    }

    @ResolveField(() => [ImportedContact])
    async importedContacts(@Parent() importedSchool: ImportedSchool): Promise<ImportedContact[]> {
        return await this.importedSchoolService.getImportedSchoolContacts(importedSchool.id);
    }

    @ResolveField(() => [ImportedStudentContact])
    async importedStudentContacts(@Parent() importedSchool: ImportedSchool): Promise<ImportedStudentContact[]> {
        return await this.importedSchoolService.getWondeSchoolStudentContacts(importedSchool.id);
    }

    @ResolveField(() => [ImportedStudent])
    async importedStudents(@Parent() importedSchool: ImportedSchool): Promise<ImportedStudent[]> {
        return await this.importedSchoolService.getImportedSchoolStudents(importedSchool.id);
    }

    @ResolveField(() => LwpSchool)
    async lwpSchool(@Parent() importedSchool: ImportedSchool): Promise<LwpSchool> {
        return await this.importedSchoolService.getLwpSchool(importedSchool.id);
    }

    @ResolveField(() => StaticLwpPeriod)
    async period(@Parent() importedSchool: ImportedSchool): Promise<StaticLwpPeriod> {
        return await this.importedSchoolService.getWondeSchoolPeriod(importedSchool.id);
    }
}
