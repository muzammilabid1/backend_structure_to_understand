import { Field, InputType } from '@nestjs/graphql';

import { DateOnly } from '../entities/scalar/DateOnly.scalar';

/** A leader's adjustment to one topic's dates for their class, made before confirming. */
@InputType()
export class SequenceItemDateOverrideInput {
    @Field()
    topicId: string;

    @Field(() => DateOnly)
    releaseDate: Date;

    @Field(() => DateOnly, { nullable: true })
    dueDate?: Date;
}

@InputType()
export class AssignSequenceToClassInput {
    @Field()
    classId: string;

    @Field()
    sequenceId: string;

    /**
     * The anchor the class's dates are computed from, required for an INTERVAL sequence and
     * ignored by a FIXED one, which carries its own dates. Must be today or later.
     */
    @Field(() => DateOnly, { nullable: true })
    startDate?: Date;

    /*
     * `intervalDays` used to live here, so a leader could run a sequence at their own pace instead
     * of the one an admin designed. LEA-6624 removed it.
     *
     * Ready Teddy is designed to run weekly, that has been communicated to schools, and a class
     * running it fortnightly changes the outcome of the programme there. So the cadence is a
     * Learning with Parents decision, held on `StaticLwpTopicSequence.intervalDays`, and this
     * operation reads it rather than being told it.
     *
     * Removed from the API rather than only hidden on the page. A field that is still accepted is
     * still a way to set the pace, and the ban would then hold only for people using our own UI.
     *
     * The anchor above is a different matter and stays: when a class starts genuinely is the
     * school's to decide.
     */

    /** Per-topic date adjustments. Each must also be today or later. */
    @Field(() => [SequenceItemDateOverrideInput], { nullable: true })
    overrides?: SequenceItemDateOverrideInput[];

    /**
     * Topics this class is not to receive, by topic id (LEA-6596).
     *
     * The second way out of a fixed sequence whose dates have passed, beside moving them forward: a
     * teacher who has missed January and February can drop those two and take the rest.
     *
     * **This does not touch the admin's sequence.** Assignment is a materialization, so "remove this
     * row" means "do not create this one" and nothing more. If it edited the template, one teacher
     * declining a topic would remove it for every class in every school that has not yet been given
     * the sequence.
     *
     * An excluded topic is still planned and still returned on the plan, marked `excluded`, so the
     * page can show it struck through and let the teacher put it back.
     */
    @Field(() => [String], { nullable: true })
    excludedTopicIds?: string[];
}
