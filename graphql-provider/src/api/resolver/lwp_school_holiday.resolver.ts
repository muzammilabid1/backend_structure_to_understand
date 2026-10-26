import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint, Or } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { OpType } from 'src/auth/types/OpType';

import { LwpSchoolHoliday } from '../entities/lwp_school_holiday';
import { LwpSchool } from '../entities/school';
import { StaticLwpPeriod } from '../entities/static_period';
import { AddSchoolHolidayInput, OperationStatus, UpdateSchoolHolidayInput } from '../model';
import { LwpSchoolHolidayService } from '../service/lwp_school_holiday.service';

@Resolver(() => LwpSchoolHoliday)
export class LwpSchoolHolidayResolver {
    constructor(private schoolHolidayService: LwpSchoolHolidayService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolHoliday])
    async allSchoolHolidays(): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayService.allSchoolHolidays();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolHoliday])
    async getHolidaysForAdmin(): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayService.getHolidaysForAdmin();
    }

    @AuthorizeEndpoint(LeaderOnly, [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => [LwpSchoolHoliday])
    async allSchoolHolidaysOfSchool(@Args('schoolId') schoolId: string): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayService.allSchoolHolidaysOfSchool(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [LwpSchoolHoliday])
    async allSchoolHolidaysOfSchoolForAdmin(@Args({ name: 'schoolId' }) schoolId: string): Promise<LwpSchoolHoliday[]> {
        return await this.schoolHolidayService.allSchoolHolidaysOfSchoolForAdmin(schoolId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => LwpSchoolHoliday)
    async getSchoolHoliday(@Args('id') id: string): Promise<LwpSchoolHoliday> {
        return await this.schoolHolidayService.getSchoolHoliday(id);
    }

    @AuthorizeEndpoint(Or(AdminOnly, [LwpSchoolHoliday, OpType.Write, null, { parentId: 'input.schoolId' }]))
    @Mutation(() => LwpSchoolHoliday)
    async addSchoolHoliday(
        @Args({ name: 'input', type: () => AddSchoolHolidayInput }) input: AddSchoolHolidayInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolHoliday> {
        return await this.schoolHolidayService.addSchoolHoliday(input, userId);
    }

    @AuthorizeEndpoint([LwpSchoolHoliday, OpType.Write, 'input.id'])
    @Mutation(() => LwpSchoolHoliday)
    async updateSchoolHoliday(
        @Args({ name: 'input', type: () => UpdateSchoolHolidayInput }) input: UpdateSchoolHolidayInput,
        @AuthInfo('sub') userId: string
    ): Promise<LwpSchoolHoliday> {
        return await this.schoolHolidayService.updateSchoolHoliday(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async releaseHolidayToAllSchools(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<boolean> {
        return await this.schoolHolidayService.releaseHolidayToAllSchools(id, userId);
    }

    @AuthorizeEndpoint([LwpSchoolHoliday, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteSchoolHoliday(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<OperationStatus> {
        return await this.schoolHolidayService.deleteSchoolHoliday(id, userId);
    }

    @ResolveField(() => StaticLwpPeriod)
    async period(@Parent() holiday: LwpSchoolHoliday): Promise<StaticLwpPeriod> {
        return await this.schoolHolidayService.getPeriodOfSchoolHoliday(holiday.id);
    }

    @ResolveField(() => [LwpSchool])
    async schools(@Parent() holiday: LwpSchoolHoliday): Promise<LwpSchool[]> {
        return await this.schoolHolidayService.getSchoolsOfSchoolHoliday(holiday.id);
    }

    @ResolveField(() => Boolean)
    async hasSchoolsLinked(@Parent() holiday: LwpSchoolHoliday): Promise<boolean> {
        return await this.schoolHolidayService.hasSchoolsLinkedToSchoolHoliday(holiday.id);
    }
}
