import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { OpType } from 'src/auth/types/OpType';

import { LwpSchool } from '../entities/school';
import { StaticLwpDataQuery } from '../entities/static_lwp_data_query';
import { LwpStaticDataQueryType, LwpStaticQueryStatus, SchoolSubjectType, UpdateDataQueryInput } from '../model';
import { LwpDataQueryService } from '../service/lwp_data_query.service';

@Resolver(() => StaticLwpDataQuery)
export class LwpDataQueryResolver {
    constructor(private dataQueryService: LwpDataQueryService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpDataQuery])
    async allDataQueries(
        @Args('type', { type: () => LwpStaticDataQueryType, nullable: true }) type: LwpStaticDataQueryType,
        @Args('status', { type: () => LwpStaticQueryStatus, nullable: true }) status: LwpStaticQueryStatus
    ): Promise<StaticLwpDataQuery[]> {
        return await this.dataQueryService.allDataQueries(type, status);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async runHourlySqlQueries(): Promise<boolean> {
        return await this.dataQueryService.runHourlySqlQueries();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async runNightlySqlQueries(): Promise<boolean> {
        return await this.dataQueryService.runNightlySqlQueries();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpDataQuery)
    async updateDataQuery(
        @Args({ name: 'input', type: () => UpdateDataQueryInput }) input: StaticLwpDataQuery,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpDataQuery> {
        return await this.dataQueryService.updateDataQuery(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async refreshDataQuery(@Args('id') id: string): Promise<boolean> {
        return await this.dataQueryService.refreshDataQuery(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => Boolean)
    async refreshAllDataQueries(): Promise<boolean> {
        return await this.dataQueryService.refreshAllDataQueries();
    }

    @AuthorizeEndpoint([LwpSchool, OpType.Read, 'schoolId'], [StaticLwpDataQuery, OpType.Read, 'id'])
    @Mutation(() => String, { nullable: true })
    async generateCSVForLeaderQuery(
        @Args('id') id: string,
        @Args('schoolId') schoolId: string,
        @Args('periodIndex') periodIndex: number
    ): Promise<string> {
        return await this.dataQueryService.generateCSVForLeaderQuery(id, schoolId, periodIndex);
    }

    @AuthorizeEndpoint(LeaderOnly)
    @Query(() => [StaticLwpDataQuery])
    async getSchoolLeaderQueries(
        @Args('subjectType', { type: () => SchoolSubjectType }) subjectType: SchoolSubjectType
    ): Promise<StaticLwpDataQuery[]> {
        return await this.dataQueryService.getSchoolLeaderBaseQueryBuilder(subjectType).getMany();
    }
}
