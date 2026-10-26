import { Field, InputType } from '@nestjs/graphql';

/**
 * One year group's sequence, sent as the sequence and nothing else.
 *
 * **The year group is deliberately not part of this.** It is denormalised onto the row, but the
 * service reads it off the sequence rather than taking it from the caller, so the two cannot
 * disagree: a client that sent a Year 1 sequence under Reception would otherwise write a row whose
 * own columns contradict each other, and the unique key would be enforcing a lie.
 */
@InputType()
export class WholeSchoolSequenceMemberInput {
    @Field()
    sequenceId: string;
}
