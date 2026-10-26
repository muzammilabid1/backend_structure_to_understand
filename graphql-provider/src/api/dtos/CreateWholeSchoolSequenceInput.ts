import { Field, InputType } from '@nestjs/graphql';

import { WholeSchoolSequenceMemberInput } from './WholeSchoolSequenceMemberInput';

/**
 * Subject, academic year, and optionally the year groups' sequences.
 *
 * There is no name: subject plus academic year identifies a whole-school sequence on its own, and
 * free text restating structured data drifts. It is created as a DRAFT; publishing is its own
 * mutation, arriving in slice 3 (LEA-6696).
 */
@InputType()
export class CreateWholeSchoolSequenceInput {
    @Field()
    subjectId: string;

    /**
     * The academic year this covers. Required, unlike on a topic sequence: every member is FIXED,
     * so a whole-school sequence always belongs to exactly one year.
     */
    @Field()
    periodIndex: number;

    /**
     * Optional, because a whole-school sequence with no members is a valid draft and an admin often
     * creates the shell before the content exists.
     *
     * It is accepted here rather than forcing a create-then-update, so that an admin who does fill
     * the year groups in on the create screen has them saved in the same action as the header. The
     * same rules apply as on update.
     */
    @Field(() => [WholeSchoolSequenceMemberInput], { nullable: true })
    members?: WholeSchoolSequenceMemberInput[];
}
