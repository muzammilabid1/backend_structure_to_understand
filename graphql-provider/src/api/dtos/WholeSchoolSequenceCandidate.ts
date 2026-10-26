import { Field, ObjectType } from '@nestjs/graphql';

import { DateOnly } from '../entities/scalar/DateOnly.scalar';

/**
 * A class sequence an admin may put against a year group, with the span of dates it would give them.
 *
 * A purpose-built shape rather than the whole `StaticLwpTopicSequence`, which would drag its items,
 * their topics and both audit users along to render one row. The picker needs a label, the year
 * group to file it under, and the dates to show read-only beside it, so that is all this carries.
 */
@ObjectType()
export class WholeSchoolSequenceCandidate {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    yearGroupId: string;

    @Field()
    yearGroupName: string;

    /**
     * The first topic's start date, and the last topic's end date where it has one.
     *
     * Read off the sequence's own items rather than stored anywhere: a whole-school sequence holds no
     * dates and never edits these. Null when the sequence has no items yet, which the picker offers
     * anyway; an empty sequence is a content problem for publishing to catch, not a reason to hide it
     * from the admin choosing.
     */
    @Field(() => DateOnly, { nullable: true })
    startDate: Date | null;

    /** Null when the last topic's window is left open, which a fixed sequence may do. */
    @Field(() => DateOnly, { nullable: true })
    endDate: Date | null;
}
