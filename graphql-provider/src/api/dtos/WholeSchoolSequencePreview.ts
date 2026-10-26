import { Field, ObjectType } from '@nestjs/graphql';
import { WholeSchoolYearGroupSkipReason } from 'lwp-shared/enums';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';

import { DateOnly } from '../entities/scalar/DateOnly.scalar';

/**
 * One row of the leader's table: what a single year group in this school would receive.
 *
 * A row is a whole sequence rather than a topic, which is why it carries a span rather than a date
 * and why nothing on it is editable. Six topics behind one row cannot share a single start date that
 * means anything, so the page offers no way to change one.
 */
@ObjectType()
export class WholeSchoolSequencePreviewRow {
    /** Ordered on by the caller, and the key the frontend lists rows by. */
    @Field()
    @AuthorizeField(TeacherField)
    yearGroupId: string;

    /** The year group's display name, as `StaticLwpYearGroup.year` holds it. */
    @Field()
    @AuthorizeField(TeacherField)
    yearGroup: string;

    /**
     * The member sequence's id. Null when this year group has no member, which is the
     * `NO_SEQUENCE_FOR_YEAR_GROUP` skip.
     *
     * Not read by the page today. It is selected because a row the leader is about to act on should
     * be traceable to the thing that produced it, and slice 6 (LEA-6699) reports per member.
     */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    sequenceId?: string;

    /** The member sequence's name, as the admin entered it. The row label. Null when there is no member. */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    sequenceName?: string;

    /**
     * The earliest and latest dates of the topics that **will actually be created**.
     *
     * The effective span, not the member's whole one (LEA-6699). A sequence running January to June,
     * read by a school in March, spans March to June here, because the January and February topics
     * are skipped. Showing the admin's original span beside "2 topics skipped" would state a range
     * this school is not being given.
     *
     * Null when there is no member, when the member's items carry no dates at all, and when every
     * topic is in the past, which is the ALL_TOPICS_IN_PAST skip: there is no span because there is
     * nothing left to span.
     */
    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(TeacherField)
    startDate?: Date;

    @Field(() => DateOnly, { nullable: true })
    @AuthorizeField(TeacherField)
    endDate?: Date;

    /** How many classes in this school would receive it. Zero is a skip, never a blank row. */
    @Field()
    @AuthorizeField(TeacherField)
    classCount: number;

    /**
     * The class topics this row would create, counted per class rather than multiplied.
     *
     * **Exact, not an upper bound.** It excludes the member's past-dated topics, its unpublished or
     * hidden ones, and, for each class separately, whatever that class already holds from an earlier
     * auto-scheduled run. One class in a year group can already have everything while its neighbour
     * has none of it, so a single multiplication could never be right.
     *
     * A topic a teacher scheduled by hand is still counted, because it is still created: that is a
     * deliberate decision of the class-level flow, which gives the class a second copy on the
     * sequence's own dates rather than letting ad hoc scheduling veto them.
     *
     * Zero on every skipped row. Summing this column gives the callout's total.
     */
    @Field()
    @AuthorizeField(TeacherField)
    activityCount: number;

    /**
     * How many of this row's classes would receive at least one topic.
     *
     * Carried rather than derived, because it cannot be worked out from the other fields: a row with
     * two classes and four activities could be two classes taking two each, or one taking all four
     * while the other already holds them. The callout's covered and skipped totals are summed from
     * this, so the table and the sentence above it cannot disagree.
     */
    @Field()
    @AuthorizeField(TeacherField)
    classesReceiving: number;

    /**
     * Topics left out of this row because their release date has passed (LEA-6699).
     *
     * A count of **topics, not activities**, so it is not multiplied by `classCount`: every class in
     * the year group skips the same ones, since the dates belong to the sequence rather than to any
     * class. It is what the row states in words.
     *
     * **The preview's own `topicsSkipped` is not a plain sum of this column.** It counts only rows
     * where a date is why something is missing, so a row skipped because its classes already hold
     * everything keeps its count here and contributes nothing there.
     *
     * Zero on a row with no member, and equal to the member's whole topic count on an
     * ALL_TOPICS_IN_PAST row.
     */
    @Field()
    @AuthorizeField(TeacherField)
    topicsSkipped: number;

    /** Nothing will be created for this year group. The reason says which case it is. */
    @Field()
    @AuthorizeField(TeacherField)
    skipped: boolean;

    /** Always set when `skipped`, always absent otherwise. */
    @Field(() => WholeSchoolYearGroupSkipReason, { nullable: true })
    @AuthorizeField(TeacherField)
    skipReason?: WholeSchoolYearGroupSkipReason;
}

/**
 * What a school was actually given, for a school that has already scheduled (LEA-6700).
 *
 * **A record of what happened, not a forecast of what would.** The two cannot be the same object
 * read twice: a forecast run again after scheduling reports every year group as already holding
 * everything, which is true and useless, because the question a leader has on this page is what
 * their school got rather than what it would get now.
 *
 * It reuses {@link WholeSchoolSequencePreviewRow} so the leader reads one table in both states, as
 * the design draws it. The fields that only a forecast can have are flat on a record: no row is
 * skipped, and no topics are reported as skipped, because a record describes rows that exist.
 */
@ObjectType()
export class WholeSchoolAssignmentRecord {
    /** The run. What LEA-6700's removal mutation is given. */
    @Field()
    @AuthorizeField(TeacherField)
    assignmentId: string;

    /** When the school scheduled, so the page can say so rather than only that it did. */
    @Field(() => DateOnly)
    @AuthorizeField(TeacherField)
    scheduledOn: Date;

    /**
     * One row per year group that received something, built from the class assignments the run
     * created rather than from the sequence it ran.
     *
     * A year group whose classes have since had their assignment removed by a teacher is absent,
     * which is correct: the row says what the school currently holds from this run, and the page
     * would otherwise promise a year group topics that are no longer there.
     */
    @Field(() => [WholeSchoolSequencePreviewRow])
    @AuthorizeField(TeacherField)
    rows: WholeSchoolSequencePreviewRow[];

    /** Class topics this run created and that still exist. The sum of the rows' own counts. */
    @Field()
    @AuthorizeField(TeacherField)
    activitiesCreated: number;

    /** Classes still holding an assignment from this run. */
    @Field()
    @AuthorizeField(TeacherField)
    classesScheduled: number;
}

/**
 * What scheduling a published whole-school sequence would give one school, computed without writing
 * anything (LEA-6697).
 *
 * Addressed by **subject**, not by whole-school sequence id, and that is a security property rather
 * than a convenience. A whole-school sequence is global static content belonging to no school, so an
 * id from the caller carries no authorization signal: the server would have to separately prove it is
 * published, for this school's current academic year, and for a subject this school is entitled to.
 * Resolving it here from the school's own period instead makes a draft, or another year's sequence,
 * unreachable rather than merely rejected.
 *
 * Slice 5's assign mutation still takes the id, from {@link wholeSchoolSequenceId} below, so a leader
 * commits to exactly the thing they were shown. It re-checks all three rules, because a mutation
 * never trusts an id from a caller.
 */
@ObjectType()
export class WholeSchoolSequencePreview {
    /**
     * The published whole-school sequence this plan came from, and what slice 5's assign mutation
     * will be given.
     *
     * **Null when there is nothing published** for this subject and this school's academic year,
     * which is an ordinary outcome and not an error: the content team may not have published yet, or
     * may only have a draft. The page shows its "nothing to schedule" state, and the rest of this
     * object is still populated so the page can say which subject it found nothing for.
     */
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    wholeSchoolSequenceId?: string;

    @Field()
    @AuthorizeField(TeacherField)
    subjectId: string;

    /** The subject's name, for the breadcrumb and the heading, so neither needs a second query. */
    @Field()
    @AuthorizeField(TeacherField)
    subjectName: string;

    /** The school's current academic year, as `StaticLwpPeriod.shortName` holds it. */
    @Field()
    @AuthorizeField(TeacherField)
    academicYear: string;

    /**
     * One row per year group worth saying something about, which is every year group that has a
     * member **or** that this school has an eligible class in.
     *
     * A year group with neither is omitted: there is no content for it and no class to receive any,
     * so a row would be noise on a page a leader reads to make one decision. Both of the other cases
     * are shown, because each is something the leader would otherwise have to notice by its absence.
     */
    @Field(() => [WholeSchoolSequencePreviewRow])
    @AuthorizeField(TeacherField)
    rows: WholeSchoolSequencePreviewRow[];

    /** The sum of every row's `activityCount`. What the "What happens next" callout leads with. */
    @Field()
    @AuthorizeField(TeacherField)
    activitiesToCreate: number;

    /**
     * Topics skipped across every row because their dates have passed (LEA-6699).
     *
     * The sum of the rows' own counts, so the callout and the table cannot disagree. Topics rather
     * than activities, for the reason {@link WholeSchoolSequencePreviewRow.topicsSkipped} gives.
     */
    @Field()
    @AuthorizeField(TeacherField)
    topicsSkipped: number;

    /** Classes that would receive something. */
    @Field()
    @AuthorizeField(TeacherField)
    classesCovered: number;

    /**
     * Eligible classes that would receive nothing: their year group has no member, or since
     * LEA-6699 its member's topics have all passed.
     *
     * Counted from the same class sweep as `classesCovered`, so the two add up to the school's
     * eligible class count and the callout cannot disagree with the table.
     */
    @Field()
    @AuthorizeField(TeacherField)
    classesSkipped: number;

    /**
     * What this school was already given, when it has scheduled this subject for this year
     * (LEA-6700). Absent for a school that has not.
     *
     * Its presence is what the page branches on, and it is checked **before** everything else on
     * this object rather than beside it. Two states would otherwise claim the same school:
     *
     *   - the empty state, because once a school holds every topic there is nothing left to create,
     *     `activitiesToCreate` is zero, and a school that had just succeeded would be told there was
     *     nothing for it and sent off to schedule every class by hand;
     *   - the action, because a teacher deleting a few of their class's topics lifts that count back
     *     above zero, and the button would be offered again to a school that has already run.
     *
     * The rest of this object is still populated in the ordinary way, so nothing has to be made
     * conditional downstream, but a school with this set is not being offered anything.
     */
    @Field(() => WholeSchoolAssignmentRecord, { nullable: true })
    @AuthorizeField(TeacherField)
    assignment?: WholeSchoolAssignmentRecord;
}
