import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpYearGroup } from '../entities/year_group';
import { OperationStatus, UpdateYearGroupInput, YearGroupInput } from '../model';
import { YearGroupService } from '../service/year_group.service';

@Resolver(() => StaticLwpYearGroup)
export class YearGroupResolver {
    constructor(private yearGroupService: YearGroupService) {}

    @AuthorizeEndpoint([StaticLwpYearGroup, OpType.Read, null])
    @Query(() => [StaticLwpYearGroup])
    async allYearGroup(@Args({ name: 'showHiddenYearGroup', nullable: true }) showHiddenYearGroup: boolean): Promise<StaticLwpYearGroup[]> {
        return await this.yearGroupService.allYearGroup(showHiddenYearGroup);
    }

    @AuthorizeEndpoint([StaticLwpYearGroup, OpType.Write, null])
    @Mutation(() => StaticLwpYearGroup)
    async addYearGroup(
        @Args({ name: 'input', type: () => YearGroupInput }) input: YearGroupInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpYearGroup> {
        return await this.yearGroupService.addYearGroup(input, userId);
    }

    @AuthorizeEndpoint([StaticLwpYearGroup, OpType.Write, 'input.id'])
    @Mutation(() => StaticLwpYearGroup)
    async updateYearGroup(
        @Args({ name: 'input', type: () => UpdateYearGroupInput }) input: UpdateYearGroupInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpYearGroup> {
        return await this.yearGroupService.updateYearGroup(input, userId);
    }

    @AuthorizeEndpoint([StaticLwpYearGroup, OpType.Write, 'id'])
    @Mutation(() => OperationStatus)
    async deleteYearGroup(@Args('id') id: string): Promise<OperationStatus> {
        return await this.yearGroupService.deleteYearGroup(id);
    }
}
