import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { ImportedSchoolClass } from 'src/api/entities/imported_school_class';
import { ImportedSchoolDataProposedLink } from 'src/api/entities/imported_school_data_proposed_link';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { LwpPupil } from 'src/api/entities/pupil';
import { LwpSchoolClass } from 'src/api/entities/school_class';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';

import { ClassDataForComparisonOutput } from '../dtos/ClassDataForComparisonOutput';
import { PendingClassLinkOutput } from '../dtos/PendingClassLinkOutput';
import { PendingPupilLinkOutput } from '../dtos/PendingPupilLinkOutput';
import { PupilDataForComparisonOutput } from '../dtos/PupilDataForComparisonOutput';
import { PupilDetails } from '../dtos/PupilDetails';
import { UpdateClassLinkRequestsInput } from '../dtos/UpdateClassLinkRequestsInput';
import { UpdateEntityLinkRequestsOutput } from '../dtos/UpdateEntityLinkRequestsOutput';
import { UpdatePupilLinkRequestsInput } from '../dtos/UpdatePupilLinkRequestsInput';
import { DataImportService } from '../service/data-import.service';
import { EntityLinkService } from '../service/entity-link.service';
import { PupilSourceType } from '../types/pupil-source-type';

@Resolver(() => ImportedSchoolDataProposedLink)
export class EntityLinkResolver {
    constructor(
        private entityLinkService: EntityLinkService,
        private readonly dataimportService: DataImportService
    ) {}

    @AuthorizeEndpoint(LeaderOnly, [ImportedSchool, OpType.Read, 'importedSchoolId'])
    @Query(() => [PendingPupilLinkOutput])
    async getPendingPupilLinks(@Args({ name: 'importedSchoolId' }) importedSchoolId: string): Promise<PendingPupilLinkOutput[]> {
        return await this.entityLinkService.getPendingPupilLinks(importedSchoolId);
    }

    @AuthorizeEndpoint(LeaderOnly, [ImportedSchool, OpType.Read, 'importedSchoolId'])
    @Query(() => [PendingClassLinkOutput])
    async getPendingClassLinks(@Args({ name: 'importedSchoolId' }) importedSchoolId: string): Promise<PendingClassLinkOutput[]> {
        return await this.entityLinkService.getPendingClassLinks(importedSchoolId);
    }

    @AuthorizeEndpoint(
        LeaderOnly,
        [ImportedStudent, OpType.Read, 'importedStudentId'],
        [LwpPupil, OpType.Read, 'platformPupilId', { optional: true }]
    )
    @Query(() => PupilDataForComparisonOutput)
    async getPupilDataForComparison(
        @Args({ name: 'importedStudentId' }) importedStudentId: string,
        @Args({ name: 'platformPupilId', nullable: true }) platformPupilId?: string
    ): Promise<PupilDataForComparisonOutput> {
        return await this.entityLinkService.getPupilDataForComparison(importedStudentId, platformPupilId);
    }

    @AuthorizeEndpoint(LeaderOnly)
    @Query(() => PupilDetails)
    async getPupilData(
        @Args({ name: 'pupilId' }) pupilId: string,
        @Args({ name: 'sourceType', type: () => PupilSourceType }) sourceType: PupilSourceType,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<PupilDetails> {
        if (sourceType === PupilSourceType.IMPORTED) {
            await ImportedStudent.authorize({
                id: pupilId,
                opType: OpType.Read,
                token: authInfo
            });
        } else if (sourceType === PupilSourceType.PLATFORM) {
            await LwpPupil.authorize({
                id: pupilId,
                opType: OpType.Read,
                token: authInfo
            });
        }

        return await this.entityLinkService.getPupilData(pupilId, sourceType);
    }

    @AuthorizeEndpoint(
        LeaderOnly,
        [ImportedSchoolClass, OpType.Read, 'importedSchoolClassId'],
        [LwpSchoolClass, OpType.Read, 'platformSchoolClassId', { optional: true }]
    )
    @Query(() => ClassDataForComparisonOutput)
    async getClassDataForComparison(
        @Args({ name: 'importedSchoolClassId' }) importedSchoolClassId: string,
        @Args({ name: 'platformSchoolClassId', nullable: true }) platformSchoolClassId?: string
    ): Promise<ClassDataForComparisonOutput> {
        return await this.entityLinkService.getClassDataForComparison(importedSchoolClassId, platformSchoolClassId);
    }

    @AuthorizeEndpoint(LeaderOnly, [ImportedSchool, OpType.Read, 'importedSchoolId'])
    @Mutation(() => UpdateEntityLinkRequestsOutput)
    async updatePupilLinkRequests(
        @Args({ name: 'input', type: () => [UpdatePupilLinkRequestsInput] }) input: UpdatePupilLinkRequestsInput[],
        @Args({ name: 'importedSchoolId' }) importedSchoolId: string
    ): Promise<UpdateEntityLinkRequestsOutput> {
        const importStatus = await this.dataimportService.handleUpdatePupilLinkRequests(input, importedSchoolId);

        return {
            importStatus
        };
    }

    @AuthorizeEndpoint(LeaderOnly, [ImportedSchool, OpType.Read, 'importedSchoolId'])
    @Mutation(() => UpdateEntityLinkRequestsOutput)
    async updateClassLinkRequests(
        @Args({ name: 'input', type: () => [UpdateClassLinkRequestsInput] }) input: UpdateClassLinkRequestsInput[],
        @Args({ name: 'importedSchoolId' }) importedSchoolId: string
    ): Promise<UpdateEntityLinkRequestsOutput> {
        const importStatus = await this.dataimportService.handleUpdateClassLinkRequests(input, importedSchoolId);

        return {
            importStatus
        };
    }
}
