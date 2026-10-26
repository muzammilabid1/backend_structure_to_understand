import { Field, InputType } from '@nestjs/graphql';
import { SequenceTimingMode } from 'lwp-shared/enums';

import { TopicSequenceItemInput } from './TopicSequenceItemInput';

@InputType()
export class CreateTopicSequenceInput {
    @Field()
    name: string;

    @Field()
    subjectId: string;

    @Field()
    yearGroupId: string;

    /**
     * The academic year the sequence is for. Required for FIXED and rejected for INTERVAL.
     *
     * A fixed sequence carries dates, so every item date must fall inside this period's start and
     * end dates and the sequence is only offered while a school is teaching that year. An interval
     * sequence carries no dates, belongs to no year, and is offered in every year forever, so
     * supplying one here is an error rather than something to ignore.
     */
    @Field({ nullable: true })
    periodIndex?: number;

    @Field(() => SequenceTimingMode)
    timingMode: SequenceTimingMode;

    /**
     * The cadence, in days: how far apart this sequence's topics run.
     *
     * Required for INTERVAL and rejected for FIXED, whose dates live on its items. It is a
     * Learning with Parents decision rather than a school's, so a teacher is never asked for it
     * (LEA-6624); it is read at assignment time to date the class's topics from the anchor the
     * teacher picks.
     *
     * `defaultStartDate` used to sit beside this and was removed by LEA-6595. The anchor is the
     * class's to choose, so the sequence had nothing to say about it.
     */
    @Field({ nullable: true })
    intervalDays?: number;

    @Field(() => [TopicSequenceItemInput])
    items: TopicSequenceItemInput[];
}
