import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { ImportedSchoolDataProposedChange } from 'src/api/entities/imported_school_data_proposed_change';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { OpType } from 'src/auth/types/OpType';

import { PendingPupilDataChangeOutput } from '../dtos/PendingPupilDataChangeOutput';
import { UpdateEntityChangeRequestsInput } from '../dtos/UpdateEntityChangeRequestsInput';
import { DataImportService } from '../service/data-import.service';

@Resolver(() => ImportedSchoolDataProposedChange)
export class EntityChangeResolver {
    constructor(private readonly dataimportService: DataImportService) {}

    @AuthorizeEndpoint(LeaderOnly, [ImportedSchool, OpType.Read, 'importedSchoolId'])
    @Query(() => [PendingPupilDataChangeOutput])
    async getPendingPupilDataChanges(
        @Args({ name: 'importedSchoolId' }) importedSchoolId: string,
        @Args({ name: 'includeRejectedChanges', type: () => Boolean }) includeRejectedChanges: boolean
    ): Promise<PendingPupilDataChangeOutput[]> {
        return await this.dataimportService.getPendingPupilDataChanges(importedSchoolId, includeRejectedChanges);
    }

    @AuthorizeEndpoint(LeaderOnly, [ImportedSchool, OpType.Read, 'importedSchoolId'])
    @Mutation(() => Boolean)
    async updateEntityChangeRequests(
        @Args({ name: 'input', type: () => UpdateEntityChangeRequestsInput }) input: UpdateEntityChangeRequestsInput,
        @Args({ name: 'importedSchoolId' }) importedSchoolId: string,
        @AuthInfo('sub') userId: string
    ): Promise<boolean> {
        return await this.dataimportService.updateEntityChangeRequests(input, importedSchoolId, userId);
    }
}
