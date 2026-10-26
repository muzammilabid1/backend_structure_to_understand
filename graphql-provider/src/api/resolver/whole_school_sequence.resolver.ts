import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { Loader } from 'nestjs-dataloader';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { CreateWholeSchoolSequenceInput } from '../dtos/CreateWholeSchoolSequenceInput';
import { UpdateWholeSchoolSequenceInput } from '../dtos/UpdateWholeSchoolSequenceInput';
import { WholeSchoolSequenceCandidate } from '../dtos/WholeSchoolSequenceCandidate';
import { WholeSchoolSequenceFilterInput } from '../dtos/WholeSchoolSequenceFilterInput';
import { WholeSchoolSequencePublishResult } from '../dtos/WholeSchoolSequencePublishResult';
import { StaticLwpWholeSchoolSequence } from '../entities/static_whole_school_sequence';
import { WholeSchoolAssignmentUsageBySequenceIdLoader } from '../loader/whole_school_assignment_usage_by_sequence.loader';
import { OperationStatus } from '../model';
import { WholeSchoolSequenceService } from '../service/whole_school_sequence.service';

/**
 * Admin management of whole-school sequences. Every endpoint here is admin only: a whole-school
 * sequence is global static content, and the leader-facing side of the feature, where a school is
 * offered a published one, is a separate surface arriving in slice 4 (LEA-6697).
 */
@Resolver(() => StaticLwpWholeSchoolSequence)
export class WholeSchoolSequenceResolver {
    constructor(private wholeSchoolSequenceService: WholeSchoolSequenceService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpWholeSchoolSequence])
    async getWholeSchoolSequences(
        @Args({ name: 'filter', type: () => WholeSchoolSequenceFilterInput, nullable: true })
        filter: WholeSchoolSequenceFilterInput
    ): Promise<StaticLwpWholeSchoolSequence[]> {
        return this.wholeSchoolSequenceService.getWholeSchoolSequences(filter);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpWholeSchoolSequence)
    async getWholeSchoolSequence(@Args('id') id: string): Promise<StaticLwpWholeSchoolSequence> {
        return this.wholeSchoolSequenceService.getWholeSchoolSequence(id);
    }

    /** The class sequences eligible to be a member, labelled by the year group they would serve. */
    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [WholeSchoolSequenceCandidate])
    async getCandidateSequencesForWholeSchool(
        @Args('subjectId') subjectId: string,
        @Args('periodIndex') periodIndex: number
    ): Promise<WholeSchoolSequenceCandidate[]> {
        return this.wholeSchoolSequenceService.getCandidateSequencesForWholeSchool(subjectId, periodIndex);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpWholeSchoolSequence)
    async createWholeSchoolSequence(
        @Args({ name: 'input', type: () => CreateWholeSchoolSequenceInput }) input: CreateWholeSchoolSequenceInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpWholeSchoolSequence> {
        return this.wholeSchoolSequenceService.createWholeSchoolSequence(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpWholeSchoolSequence)
    async updateWholeSchoolSequence(
        @Args({ name: 'input', type: () => UpdateWholeSchoolSequenceInput }) input: UpdateWholeSchoolSequenceInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpWholeSchoolSequence> {
        return this.wholeSchoolSequenceService.updateWholeSchoolSequence(input, userId);
    }

    /**
     * Its own mutation rather than a status on update, because it runs checks that saving does not.
     *
     * Returns the uncovered year groups alongside the published sequence. They are a warning rather
     * than an error: a partial whole-school sequence is publishable, and a class in an uncovered year
     * group is skipped later rather than refused.
     */
    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => WholeSchoolSequencePublishResult)
    async publishWholeSchoolSequence(@Args('id') id: string, @AuthInfo('sub') userId: string): Promise<WholeSchoolSequencePublishResult> {
        return this.wholeSchoolSequenceService.publishWholeSchoolSequence(id, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteWholeSchoolSequence(@Args('id') id: string): Promise<OperationStatus> {
        return this.wholeSchoolSequenceService.deleteWholeSchoolSequence(id);
    }

    /**
     * Whether any school has scheduled this, which locks its subject, year and members (LEA-6700).
     *
     * Batched, because the admin list renders every whole-school sequence there is, so this is asked
     * once per page rather than once per row. The same shape as `TopicSequenceResolver.hasAssignments`,
     * which LEA-6585 built for exactly this purpose one level down.
     */
    @ResolveField(() => Boolean)
    async hasAssignments(
        @Parent() wholeSchoolSequence: StaticLwpWholeSchoolSequence,
        @Loader(WholeSchoolAssignmentUsageBySequenceIdLoader) usageLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return usageLoader.load(wholeSchoolSequence.id);
    }
}
