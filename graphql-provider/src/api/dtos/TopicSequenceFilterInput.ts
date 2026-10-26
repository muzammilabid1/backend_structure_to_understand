import { Field, InputType } from '@nestjs/graphql';

/**
 * Filters for the admin sequence list. There is deliberately no unique constraint on
 * (subject, year group), so expect several sequences per pair, for instance Autumn and Spring.
 */
@InputType()
export class TopicSequenceFilterInput {
    @Field({ nullable: true })
    subjectId?: string;

    @Field({ nullable: true })
    yearGroupId?: string;

    /** Case-insensitive match on the sequence name. */
    @Field({ nullable: true })
    search?: string;
}
