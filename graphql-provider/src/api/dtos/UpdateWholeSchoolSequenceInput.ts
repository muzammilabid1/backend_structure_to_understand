import { Field, InputType } from '@nestjs/graphql';

import { WholeSchoolSequenceMemberInput } from './WholeSchoolSequenceMemberInput';

/**
 * Moves a whole-school sequence to another subject or academic year, and sets which class sequence
 * each year group receives.
 *
 * The status is not editable here. Publishing runs checks that saving does not, so it is its own
 * mutation (LEA-6696); a status that an unrelated edit can set in passing is a status nobody trusts.
 */
@InputType()
export class UpdateWholeSchoolSequenceInput {
    @Field()
    id: string;

    @Field()
    subjectId: string;

    @Field()
    periodIndex: number;

    /**
     * Omit to keep the existing members, or send a list to replace them wholesale. The same shape as
     * `UpdateTopicSequenceInput.items`, and for the same reason: one whole-form save keeps the edit
     * atomic and cannot act on a stale member id.
     *
     * An empty array is not the same as omitting. It clears every member, which is a valid state: a
     * whole-school sequence may be saved with none.
     */
    @Field(() => [WholeSchoolSequenceMemberInput], { nullable: true })
    members?: WholeSchoolSequenceMemberInput[];
}
