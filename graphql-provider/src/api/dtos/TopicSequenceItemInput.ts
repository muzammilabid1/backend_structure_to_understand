import { Field, InputType } from '@nestjs/graphql';

import { DateOnly } from '../entities/scalar/DateOnly.scalar';

/**
 * One topic's place in a sequence.
 *
 * Which fields matter depends on the sequence's timing mode. INTERVAL sequences use
 * `order` and generate the dates from the sequence's start plus its interval, so the dates
 * here are ignored. FIXED sequences derive the order chronologically, so `order` here is
 * ignored, and require a start date but not an end date.
 */
@InputType()
export class TopicSequenceItemInput {
    @Field()
    topicId: string;

    /** 1-based position. Required for INTERVAL, ignored for FIXED. */
    @Field({ nullable: true })
    order?: number;

    /** Required for FIXED, ignored for INTERVAL. */
    @Field(() => DateOnly, { nullable: true })
    startDate?: Date;

    /**
     * Optional for FIXED, ignored for INTERVAL. Leaving it open matches what a teacher may do
     * when scheduling a topic by hand, where the due date is optional.
     */
    @Field(() => DateOnly, { nullable: true })
    endDate?: Date | null;
}
