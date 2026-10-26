import { Field, InputType } from '@nestjs/graphql';
import { SequenceTimingMode } from 'lwp-shared/enums';

import { TopicSequenceItemInput } from './TopicSequenceItemInput';

/**
 * Editing a sequence never touches classes it has already been assigned to. The template only
 * seeds class topics at assignment time, so edits apply to future assignments only.
 */
@InputType()
export class UpdateTopicSequenceInput {
    @Field()
    id: string;

    @Field()
    name: string;

    @Field()
    subjectId: string;

    @Field()
    yearGroupId: string;

    /**
     * The academic year the sequence is for. Required for FIXED and rejected for INTERVAL.
     *
     * For a fixed sequence every item date must fall inside this period's start and end dates, so
     * moving one to another year means re-dating its items too. An interval sequence carries no
     * dates and belongs to no year, so supplying one here is an error rather than something to
     * ignore: it is how a form that has switched timing mode without clearing its state announces
     * itself.
     */
    @Field({ nullable: true })
    periodIndex?: number;

    @Field(() => SequenceTimingMode)
    timingMode: SequenceTimingMode;

    /** The cadence, in days. Required for INTERVAL and rejected for FIXED, as on creation. */
    @Field({ nullable: true })
    intervalDays?: number;

    /**
     * Omit to keep the existing items, which are then re-dated if the timing changed. Provide a
     * list to replace them wholesale.
     */
    @Field(() => [TopicSequenceItemInput], { nullable: true })
    items?: TopicSequenceItemInput[];
}
