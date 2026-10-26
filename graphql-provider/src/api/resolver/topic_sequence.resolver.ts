import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { Loader } from 'nestjs-dataloader';
import { AuthInfo, AuthorizeEndpoint } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';

import { CreateTopicSequenceInput } from '../dtos/CreateTopicSequenceInput';
import { SequenceCandidateTopicGroup } from '../dtos/SequenceCandidateTopicGroup';
import { TopicSequenceFilterInput } from '../dtos/TopicSequenceFilterInput';
import { TopicSequenceItemInput } from '../dtos/TopicSequenceItemInput';
import { UpdateTopicSequenceInput } from '../dtos/UpdateTopicSequenceInput';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';
import { SequenceAssignmentUsageBySequenceIdLoader } from '../loader/sequence_assignment_usage_by_sequence.loader';
import { OperationStatus } from '../model';
import { TopicSequenceService } from '../service/topic_sequence.service';

/**
 * Admin management of topic sequences. Every endpoint here is admin only: the school-facing
 * side of the feature, where a leader picks an eligible sequence for a class, is a separate
 * surface (LEA-6424).
 */
@Resolver(() => StaticLwpTopicSequence)
export class TopicSequenceResolver {
    constructor(private topicSequenceService: TopicSequenceService) {}

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [StaticLwpTopicSequence])
    async getSequences(
        @Args({ name: 'filter', type: () => TopicSequenceFilterInput, nullable: true }) filter: TopicSequenceFilterInput
    ): Promise<StaticLwpTopicSequence[]> {
        return this.topicSequenceService.getSequences(filter);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Query(() => StaticLwpTopicSequence)
    async getSequence(@Args('id') id: string): Promise<StaticLwpTopicSequence> {
        return this.topicSequenceService.getSequence(id);
    }

    /** Topics available for a sequence's subject and year group, grouped by domain for the picker. */
    @AuthorizeEndpoint(AdminOnly)
    @Query(() => [SequenceCandidateTopicGroup])
    async getCandidateTopicsForSequence(
        @Args('subjectId') subjectId: string,
        @Args('yearGroupId') yearGroupId: string,
        @Args({ name: 'search', nullable: true }) search: string
    ): Promise<SequenceCandidateTopicGroup[]> {
        return this.topicSequenceService.getCandidateTopicsForSequence(subjectId, yearGroupId, search);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicSequence)
    async createSequence(
        @Args({ name: 'input', type: () => CreateTopicSequenceInput }) input: CreateTopicSequenceInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicSequence> {
        return this.topicSequenceService.createSequence(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicSequence)
    async updateSequence(
        @Args({ name: 'input', type: () => UpdateTopicSequenceInput }) input: UpdateTopicSequenceInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicSequence> {
        return this.topicSequenceService.updateSequence(input, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => OperationStatus)
    async deleteSequence(@Args('id') id: string): Promise<OperationStatus> {
        return this.topicSequenceService.deleteSequence(id);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicSequence)
    async addSequenceItem(
        @Args('sequenceId') sequenceId: string,
        @Args({ name: 'item', type: () => TopicSequenceItemInput }) item: TopicSequenceItemInput,
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicSequence> {
        return this.topicSequenceService.addSequenceItem(sequenceId, item, userId);
    }

    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicSequence)
    async removeSequenceItem(@Args('itemId') itemId: string, @AuthInfo('sub') userId: string): Promise<StaticLwpTopicSequence> {
        return this.topicSequenceService.removeSequenceItem(itemId, userId);
    }

    /** Interval sequences only: a fixed sequence takes its order from the topic dates. */
    @AuthorizeEndpoint(AdminOnly)
    @Mutation(() => StaticLwpTopicSequence)
    async reorderSequenceItems(
        @Args('sequenceId') sequenceId: string,
        @Args({ name: 'orderedItemIds', type: () => [String] }) orderedItemIds: string[],
        @AuthInfo('sub') userId: string
    ): Promise<StaticLwpTopicSequence> {
        return this.topicSequenceService.reorderSequenceItems(sequenceId, orderedItemIds, userId);
    }

    @ResolveField(() => Number)
    async itemCount(@Parent() sequence: StaticLwpTopicSequence): Promise<number> {
        return sequence.items?.length ?? this.topicSequenceService.getSequenceItemCount(sequence.id);
    }

    /**
     * Whether this sequence has ever been assigned to a class, which locks its academic year.
     *
     * Batched because the admin list renders every sequence, so this is asked once per page rather
     * than once per row.
     */
    @ResolveField(() => Boolean)
    async hasAssignments(
        @Parent() sequence: StaticLwpTopicSequence,
        @Loader(SequenceAssignmentUsageBySequenceIdLoader) assignmentUsageLoader: DataLoader<string, boolean>
    ): Promise<boolean> {
        return assignmentUsageLoader.load(sequence.id);
    }
}
