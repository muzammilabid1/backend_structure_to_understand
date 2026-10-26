import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UserType } from 'lwp-shared';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { OpType } from 'src/auth/types/OpType';

import { LwpSchool } from '../entities/school';
import { StaticLwpPeriod } from '../entities/static_period';
import { LwpUser } from '../entities/user';
import { OperationStatus, PeriodInput, UpdatePeriodInput } from '../model';
import { StaticLwpPeriodService } from '../service/static_period.service';

@Resolver(() => StaticLwpPeriod)
export class StaticLwpPeriodResolver {
    constructor(private staticLwpPeriodService: StaticLwpPeriodService) {}

    @AuthorizeEndpoint(TeacherOnly, [StaticLwpPeriod, OpType.Read, null])
    @Query(() => [StaticLwpPeriod])
    async allStaticPeriods(): Promise<StaticLwpPeriod[]> {
        return await this.staticLwpPeriodService.allStaticPeriods();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpPeriod])
    async getCurrentAndFutureStaticPeriods(): Promise<StaticLwpPeriod[]> {
        return await this.staticLwpPeriodService.getCurrentAndFutureStaticPeriods();
    }

    @AuthorizeEndpoint([StaticLwpPeriod, OpType.Read, 'index'])
    @Query(() => StaticLwpPeriod)
    async getStaticPeriod(@Args('index') index: number): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodService.getStaticPeriod(index);
    }

    @AuthorizeEndpoint([StaticLwpPeriod, OpType.Read, null])
    @Query(() => StaticLwpPeriod)
    async getCurrentPeriod(): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodService.getCurrentPeriod();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpPeriod)
    async addStaticPeriod(@Args('input') input: PeriodInput, @AuthInfo('sub') userId: string): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodService.addStaticPeriod(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpPeriod)
    async updateStaticPeriod(@Args('input') input: UpdatePeriodInput, @AuthInfo('sub') userId: string): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodService.updateStaticPeriod(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteStaticPeriod(@Args({ name: 'index' }) index: number): Promise<OperationStatus> {
        return this.staticLwpPeriodService.deleteStaticPeriod(index);
    }

    @AuthorizeEndpoint(TeacherOnly, [StaticLwpPeriod, OpType.Read, null], [LwpUser, OpType.Read, 'teacherId'])
    @Query(() => [StaticLwpPeriod])
    async getStaticPeriodsForFeedbackFilter(
        @Args({ name: 'teacherId' }) teacherId: string,
        @Args({ name: 'schoolId' }) schoolId: string,
        @AuthInfo() authInfo: AuthTokenJWT
    ): Promise<StaticLwpPeriod[]> {
        const isAdminOrSchoolLeader = authInfo?.userType === UserType.ADMIN || authInfo?.isSchoolLeader;

        return await this.staticLwpPeriodService.getStaticPeriodsForFeedbackFilter(teacherId, schoolId, isAdminOrSchoolLeader);
    }

    @AuthorizeEndpoint(TeacherOnly, [StaticLwpPeriod, OpType.Read, null], [LwpSchool, OpType.Read, 'schoolId'])
    @Query(() => StaticLwpPeriod, { nullable: true })
    async getSchoolPreviousAcademicYearForDataDownload(@Args({ name: 'schoolId' }) schoolId: string): Promise<StaticLwpPeriod | null> {
        return await this.staticLwpPeriodService.getSchoolPreviousAcademicYearForDataDownload(schoolId);
    }

    @ResolveField(() => StaticLwpPeriod)
    async nextPeriod(@Parent() period: StaticLwpPeriod): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodService.getNextPeriod(period.index);
    }

    @ResolveField(() => StaticLwpPeriod)
    async previousPeriod(@Parent() period: StaticLwpPeriod): Promise<StaticLwpPeriod> {
        return await this.staticLwpPeriodService.getPrevPeriod(period.index);
    }
}
