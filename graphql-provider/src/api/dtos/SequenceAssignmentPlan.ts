import { Field, ObjectType } from '@nestjs/graphql';
import { SequenceItemSkipReason } from 'lwp-shared/enums';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';

import { LwpClassSequenceAssignment } from '../entities/class_sequence_assignment';
import { DateOnly } from '../entities/scalar/DateOnly.scalar';
import { StaticLwpTopic } from '../entities/static_topic';
import { StaticLwpTopicSequence } from '../entities/static_topic_sequence';

/** One topic's computed dates for a class, and whether it will actually be scheduled. */
@ObjectType()
export class SequenceAssignmentPlanItem {
    @Field(() => StaticLwpTopic)
    @AuthorizeField(UnrestrictedField)
    topic: StaticLwpTopic;

    @Field()
    @AuthorizeField(UnrestrictedField)
    order: number;

    /**
     * Absent when the topic is not being scheduled at all, which today means the teacher dropped it.
     * A row that will never reach the class has no window to show, and on an interval sequence the
     * slot it used to hold no longer exists: the topics below it have closed the gap.
     */
    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    releaseDate: Date | null;

    /** Absent when the sequence item has no end date, as a manually scheduled topic's may be. */
    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    dueDate: Date | null;

    @Field()
    @AuthorizeField(UnrestrictedField)
    skipped: boolean;

    @Field(() => SequenceItemSkipReason, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    skipReason?: SequenceItemSkipReason;

    /**
     * The class already has this topic from someone scheduling it by hand, so auto-scheduling will
     * add a second one on these dates. A warning rather than a skip: the leader is told, and it is
     * still created.
     *
     * Never true at the same time as `skipped`. A topic a previous auto-schedule created is skipped
     * instead, so re-running the same set does not silently double everything.
     */
    @Field()
    @AuthorizeField(UnrestrictedField)
    alreadyScheduled: boolean;

    /**
     * The teacher chose not to give this class this topic (LEA-6596).
     *
     * Kept apart from `skipped`, which is the server's decision rather than the teacher's. Both mean
     * the topic is not created, but they read differently on screen and count differently in the
     * summary: a skip is something that happened to the plan, an exclusion is something the teacher
     * did to it and can undo.
     */
    @Field()
    @AuthorizeField(UnrestrictedField)
    excluded: boolean;
}

/**
 * What assigning a sequence to a class will do, or has just done.
 *
 * The same shape serves both the preview and the assign mutation, so the leader confirms exactly
 * what they were shown. `assignment` is only populated once the topics have been created.
 */
@ObjectType()
export class SequenceAssignmentPlan {
    @Field(() => StaticLwpTopicSequence)
    @AuthorizeField(UnrestrictedField)
    sequence: StaticLwpTopicSequence;

    /** The INTERVAL anchor the dates were computed from. NULL for a FIXED sequence. */
    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    startDate?: Date;

    @Field(() => [SequenceAssignmentPlanItem])
    @AuthorizeField(UnrestrictedField)
    items: SequenceAssignmentPlanItem[];

    @Field()
    @AuthorizeField(UnrestrictedField)
    scheduledCount: number;

    /** Topics the server withheld: already scheduled by an earlier run, or unavailable. */
    @Field()
    @AuthorizeField(UnrestrictedField)
    skippedCount: number;

    /** Topics the teacher dropped. Counted apart from skips, since the two read differently. */
    @Field()
    @AuthorizeField(UnrestrictedField)
    excludedCount: number;

    @Field(() => LwpClassSequenceAssignment, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    assignment?: LwpClassSequenceAssignment;
}
