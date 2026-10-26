import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { TeacherOnly } from 'src/auth/authorizers/TeacherOnly';
import { OpType } from 'src/auth/types/OpType';

import { StaticLwpSubject } from '../entities/static_lwp_subject';
import { StaticLwpTrophy } from '../entities/static_trophy';
import { OperationStatus, StaticLwpTrophyInput, UpdateStaticLwpTrophyInput } from '../model';
import { StaticTrophyService } from '../service/static_trophy.service';

@Resolver(() => StaticLwpTrophy)
export class StaticTrophyResolver {
    constructor(private trophyService: StaticTrophyService) {}

    // @@@P - not sure why this is unauthenticated - not a risk but could be worth checking
    @Query(() => StaticLwpTrophy)
    @AuthorizeEndpoint([StaticLwpTrophy, OpType.Read, 'id'])
    async getStaticTrophy(@Args({ name: 'id' }) id: string): Promise<StaticLwpTrophy> {
        return this.trophyService.getTrophyById(id);
    }

    @AuthorizeEndpoint(TeacherOnly, [StaticLwpTrophy, OpType.Read, null])
    @Query(() => StaticLwpTrophy)
    async getRecentStaticTrophy(): Promise<StaticLwpTrophy> {
        return this.trophyService.getRecentStaticTrophy();
    }

    @AuthorizeEndpoint(TeacherOnly, [StaticLwpTrophy, OpType.Read, null])
    @Query(() => Boolean)
    async isActiveStaticTrophyExist(): Promise<boolean> {
        return this.trophyService.isActiveStaticTrophyExist();
    }

    @AuthorizeEndpoint(TeacherOnly, [StaticLwpTrophy, OpType.Read, null])
    @Query(() => [StaticLwpTrophy])
    async getActiveStaticTrophy(): Promise<StaticLwpTrophy[]> {
        return this.trophyService.getActiveStaticTrophy();
    }

    // @@@P - not sure why this is unauthenticated - not a risk but could be worth checking
    @Query(() => [StaticLwpTrophy])
    @AuthorizeEndpoint(AdminOnly)
    async getStaticTrophies(): Promise<StaticLwpTrophy[]> {
        return this.trophyService.getTrophies();
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => String)
    async generateTestCertificate(@Args('id') id: string): Promise<string> {
        return this.trophyService.generateTestCertificate(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTrophy)
    async createStaticTrophy(
        @Args({ name: 'input' }) input: StaticLwpTrophyInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTrophy> {
        return this.trophyService.createTrophy(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTrophy)
    async updateStaticTrophy(
        @Args({ name: 'input', type: () => UpdateStaticLwpTrophyInput }) input: UpdateStaticLwpTrophyInput,
        @Args({ name: 'file', type: () => [GraphQLUpload], nullable: true }) file: FileUpload[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTrophy> {
        return this.trophyService.updateTrophy(input, file, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteStaticTrophy(@Args({ name: 'id' }) id: string): Promise<OperationStatus> {
        return this.trophyService.deleteTrophy(id);
    }

    @ResolveField(() => [StaticLwpSubject], { nullable: true })
    async subjects(@Parent() trophy: StaticLwpTrophy): Promise<StaticLwpSubject[]> {
        return await this.trophyService.getTrophySubjects(trophy?.id);
    }
}
