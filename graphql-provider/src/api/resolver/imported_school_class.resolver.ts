import { HttpException } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { ImportedSchool } from '../entities/imported_school';
import { ImportedSchoolClass } from '../entities/imported_school_class';
import { ImportedStudent } from '../entities/imported_student';
import { LwpSchoolClass } from '../entities/school_class';
import { StaticLwpPeriod } from '../entities/static_period';
import { StaticLwpYearGroup } from '../entities/year_group';
import { ErrorStatusCodeEnum } from '../model';
import { ImportedSchoolClassService } from '../service/imported_school_class.service';
import { SchoolClassService } from '../service/school_class.service';

@Resolver(() => ImportedSchoolClass)
export class ImportedSchoolClassResolver {
    constructor(
        private importedSchoolClassService: ImportedSchoolClassService,
        private schoolClassService: SchoolClassService
    ) {}

    @AuthorizeEndpoint([ImportedSchoolClass, OpType.Read, 'importedSchoolClassId'])
    @Query(() => ImportedSchoolClass)
    async getImportedSchoolClass(@Args('importedSchoolClassId') importedSchoolClassId: string): Promise<ImportedSchoolClass> {
        const importedSchoolClass = await this.importedSchoolClassService.getImportedSchoolClass(importedSchoolClassId);

        if (!importedSchoolClass) throw new HttpException('Wonde School Class does not exist', ErrorStatusCodeEnum._535);

        return importedSchoolClass;
    }

    @AuthorizeEndpoint([ImportedSchoolClass, OpType.Read, 'importedSchoolClassId'])
    @Query(() => [ImportedStudent])
    async getImportedSchoolClassPupils(@Args('importedSchoolClassId') importedSchoolClassId: string): Promise<ImportedStudent[]> {
        const importedSchoolClass = await this.importedSchoolClassService.getImportedClassPupils(importedSchoolClassId);

        if (!importedSchoolClass) throw new HttpException('Wonde School Class does not exist', ErrorStatusCodeEnum._535);

        return importedSchoolClass;
    }

    @ResolveField(() => StaticLwpYearGroup)
    async yearGroup(@Parent() importedSchoolClass: ImportedSchoolClass): Promise<StaticLwpYearGroup> {
        return await this.importedSchoolClassService.getWondeSchoolClassYearGroup(importedSchoolClass.id);
    }

    @ResolveField(() => LwpSchoolClass)
    async lwpSchoolClass(@Parent() importedSchoolClass: ImportedSchoolClass): Promise<LwpSchoolClass> {
        return await this.importedSchoolClassService.getLwpSchoolClasses(importedSchoolClass.id);
    }

    @ResolveField(() => [ImportedStudent])
    async students(@Parent() importedSchoolClass: ImportedSchoolClass): Promise<ImportedStudent[]> {
        return await this.importedSchoolClassService.getImportedClassPupils(importedSchoolClass.id);
    }

    @ResolveField(() => ImportedSchool)
    async school(@Parent() importedSchoolClass: ImportedSchoolClass): Promise<ImportedSchool> {
        return await this.importedSchoolClassService.getWondeClassSchool(importedSchoolClass.id);
    }

    @ResolveField(() => StaticLwpPeriod)
    async period(@Parent() importedSchoolClass: ImportedSchoolClass): Promise<StaticLwpPeriod> {
        return await this.importedSchoolClassService.getWondeClassPeriod(importedSchoolClass.id);
    }
}
