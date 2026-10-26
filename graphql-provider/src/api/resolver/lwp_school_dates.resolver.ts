import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { OpType } from 'src/auth/types/OpType';

import { SchoolTermsForSchoolImpactReportOutput } from '../dtos/SchoolTermsForSchoolImpactReportOutput';
import { LwpSchoolDates } from '../entities/lwp_school_dates';
import { LwpSchool } from '../entities/school';
import { AddSchoolDateInput, OperationStatus, UpdateSchoolDateInput } from '../model';
import { LwpSchoolDatesService } from '../service/lwp_school_dates.service';

@Resolver(() => LwpSchoolDates)
export class LwpSchoolDatesResolver {
    constructor(private schoolDatesService: LwpSchoolDatesService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolDates])
    async allSchoolDates(): Promise<LwpSchoolDates[]> {
        return await this.schoolDatesService.allSchoolDates();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpSchoolDates)
    async getCurrentSchoolTerm(): Promise<LwpSchoolDates> {
        return await this.schoolDatesService.getCurrentSchoolTerm();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpSchoolDates)
    async getSchoolDate(@Args('id') id: string): Promise<LwpSchoolDates> {
        return await this.schoolDatesService.getSchoolDate(id);
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [SchoolTermsForSchoolImpactReportOutput])
    async getTermsForSchoolImpactReport(@Args({ name: 'schoolId' }) schoolId: string): Promise<SchoolTermsForSchoolImpactReportOutput[]> {
        return await this.schoolDatesService.getTermsForSchoolImpactReport(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolDates])
    async getAllTermsForSchoolImpactReport(): Promise<LwpSchoolDates[]> {
        return await this.schoolDatesService.getAllTermsForSchoolImpactReport();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchoolDates)
    async addSchoolDate(
        @Args({ name: 'input', type: () => AddSchoolDateInput }) input: AddSchoolDateInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolDates> {
        return await this.schoolDatesService.addSchoolDate(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => LwpSchoolDates)
    async updateSchoolDate(
        @Args({ name: 'input', type: () => UpdateSchoolDateInput }) input: UpdateSchoolDateInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolDates> {
        return await this.schoolDatesService.updateSchoolDate(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteSchoolDate(@Args('id') id: string): Promise<OperationStatus> {
        return await this.schoolDatesService.deleteSchoolDate(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @ResolveField()
    termPeriodIndex(@Parent() term: LwpSchoolDates): number {
        return term?.periodIndex;
    }
}
