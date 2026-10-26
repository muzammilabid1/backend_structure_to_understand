import { WholeSchoolYearGroupSkipReason } from 'lwp-shared/enums';
import moment from 'moment';

import {
    IWholeSchoolAssignmentRecord,
    IWholeSchoolAssignmentSummary,
    IWholeSchoolSequencePreview,
    IWholeSchoolSequencePreviewRow
} from '../../../types/entities/IWholeSchoolSequencePreview';
import { FormatDate } from '../../Admin/Sequences/sequenceOrdering';

/** The chip on a skipped row. Short, because the row also carries the sentence below. */
export const skipReasonLabel = (reason?: WholeSchoolYearGroupSkipReason | null): string => {
    if (reason === WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP) return 'No topics yet';
    if (reason === WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES) return 'No classes';
    if (reason === WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST) return 'Dates passed';
    if (reason === WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS) return 'Not available';
    if (reason === WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS) return 'Already added';

    return 'Skipped';
};

/**
 * Why a year group is getting nothing, spelled out under its row.
 *
 * Both sentences are written so a leader knows whether it is theirs to act on. The first is not: the
 * content is not ready and no one at the school can change that. The second may be, because a class
 * that is not set up for the programme is a school-side fact.
 */
export const skipReasonExplanation = (reason?: WholeSchoolYearGroupSkipReason | null): string => {
    if (reason === WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP) {
        return 'There are no topics for this year group yet, so these classes will not be given anything.';
    }

    if (reason === WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES) {
        return 'There are no classes set up for this programme in this year group, so nothing will be scheduled.';
    }

    /*
     * Says the dates have gone rather than that something is wrong, because nothing is. This is the
     * ordinary outcome for a school meeting a sequence late in the year, and the leader has no way
     * to change it: the page is read-only by design.
     */
    if (reason === WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST) {
        return 'Every topic for this year group is dated in the past, so there is nothing left to schedule.';
    }

    /*
     * Content the team has not published yet. Said plainly rather than apologetically, because a
     * leader can do nothing about it and would otherwise go looking for a setting of their own.
     */
    if (reason === WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS) {
        return 'The topics for this year group are not available yet, so nothing will be scheduled.';
    }

    /*
     * Not a problem at all, which is why it says the classes have them rather than that something
     * was refused. It is what a school sees when it comes back to a sequence it has already run.
     */
    if (reason === WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS) {
        return 'These classes already have all of these topics, so there is nothing to add.';
    }

    return 'Nothing will be scheduled for this year group.';
};

/**
 * The date span on a row, or a plain statement when there is none.
 *
 * A skipped row shows no dates at all rather than its sequence's, because nothing will exist on them.
 * That is the same rule the class-level preview table follows for a skipped topic, and for the same
 * reason: dates nothing will be created on read as a promise.
 */
export const formatRowDates = (row: IWholeSchoolSequencePreviewRow, formatDate: FormatDate): string => {
    if (row.skipped) return 'Not being scheduled';
    if (!row.startDate) return 'No dates yet';

    const start = formatDate(row.startDate);

    // A sequence whose last topic has no end date closes on that topic's start date, which the server
    // has already resolved, so a single date here means the whole sequence is one topic long.
    return row.endDate && row.endDate !== row.startDate ? `${start} to ${formatDate(row.endDate)}` : start;
};

/** English for a count of things, so no sentence below has to read "1 classes". */
const pluralise = (count: number, singular: string, pluralForm: string): string => `${count} ${count === 1 ? singular : pluralForm}`;

/**
 * What a row says about the topics it is dropping, or nothing at all (LEA-6699).
 *
 * Only on a row that is still getting something. A row skipped outright already carries
 * {@link skipReasonExplanation}, and two sentences saying the same thing in different words would
 * read as two separate problems.
 *
 * The count is of topics rather than activities, matching the field, because every class in the
 * year group drops the same ones: the dates belong to the sequence, not to any class.
 */
export const describeRowSkippedTopics = (row: IWholeSchoolSequencePreviewRow): string | null => {
    if (row.skipped || !row.topicsSkipped) return null;

    return row.topicsSkipped === 1
        ? '1 topic skipped, its date has passed.'
        : `${row.topicsSkipped} topics skipped, their dates have passed.`;
};

/**
 * Whether every topic on this row has finished, which is the row the design greys out and badges
 * "Completed".
 *
 * **Only ever true on the already-scheduled record.** An offer's rows exclude past-dated topics
 * (LEA-6699), so their effective span always ends in the future. That is what lets the table ask
 * this of every row without knowing which of the two states it is drawing.
 *
 * A row ending **today** is not finished. Its topics stay open to pupils until the due date has
 * gone, so it is still the one they are working on.
 *
 * Compared by calendar day through `moment`, the way every other date comparison on the frontend is
 * (see `isDateInOrAfterCurrentWeek`). A UTC string compare reads the wrong day for the first hour
 * after midnight through British Summer Time.
 */
export const isRowCompleted = (row: IWholeSchoolSequencePreviewRow): boolean => {
    // Skipped means never scheduled, so there is nothing for it to have finished.
    if (row.skipped) return false;

    // The same fallback {@link formatRowDates} uses: a one-topic sequence closes on its start date.
    const end = row.endDate ?? row.startDate;

    return Boolean(end) && moment(end).isBefore(moment(), 'day');
};

/**
 * The line above the table, reconciled against the rows on screen.
 *
 * Covered and skipped are said separately rather than netted off, exactly as the class-level summary
 * says skipped and removed separately. A single number would leave the leader unable to tell whether
 * every class in their school had been accounted for, which is the one thing this page exists to
 * tell them.
 */
export const describePreviewSummary = (preview: IWholeSchoolSequencePreview): string => {
    const activities = pluralise(preview.activitiesToCreate, 'activity', 'activities');
    const covered = pluralise(preview.classesCovered, 'class', 'classes');

    const base = `${activities} will be added across ${covered}.`;

    /*
     * The same number the rows state, summed, so a leader adding up the column lands on this
     * (LEA-6699). Said before the skipped classes because it qualifies the sentence above it: these
     * are topics missing from year groups that are otherwise being scheduled.
     */
    /*
     * Taken as given. Which rows a skipped topic is worth reporting from is a question about what
     * the skip reasons mean, and the server owns those, so it answers it. Deciding here would mean
     * keeping a list of qualifying reasons in a file whose only job is wording.
     */
    const skippedTopicsSentence =
        preview.topicsSkipped === 1
            ? '1 topic is not being scheduled, because its date has passed.'
            : `${preview.topicsSkipped} topics are not being scheduled, because their dates have passed.`;

    const withTopics = preview.topicsSkipped ? `${base} ${skippedTopicsSentence}` : base;

    if (!preview.classesSkipped) return withTopics;

    /*
     * The count, and not a reason for it.
     *
     * This sentence used to end "because there are no topics for their year group yet", which was
     * true while that was the only way a class could be left out. It no longer is: a year group's
     * topics can have passed, or be unpublished, or its classes can already hold every one of them.
     * One reason stated for a mixed set is wrong for most of it, and the version that tried to
     * decide which reason applied was wrong in a way nothing caught, because it was written when
     * there were two reasons and never revisited when there were five.
     *
     * Each row states its own reason, which is the honest place for it: the reasons differ per year
     * group, and that is exactly what the table is for.
     */
    return `${withTopics} ${pluralise(preview.classesSkipped, 'class', 'classes')} will not be given anything.`;
};

/**
 * Whether there is a plan worth showing.
 *
 * Two different nothings, deliberately treated as one on screen: no published whole-school sequence
 * for this school's year, and one that would create nothing here. A leader can act on neither, and
 * the page says the same thing about both. They are still told apart from a **failed** request,
 * which is a separate state entirely, because saying "there is nothing" on no information is a claim
 * the page has not earned.
 */
export const hasSomethingToSchedule = (preview?: IWholeSchoolSequencePreview | null): boolean =>
    Boolean(preview?.wholeSchoolSequenceId) && (preview?.activitiesToCreate ?? 0) > 0;

/**
 * What the leader is told once the school has been scheduled (LEA-6698).
 *
 * Counted from what was actually written rather than from the preview they were looking at, because
 * the two can legitimately differ: a class that already holds everything it would be given is left
 * out of the run, and the preview's activity count is still an upper bound where a class already
 * holds some of the topics. LEA-6699 closed the past-dated part of that gap and deliberately not the
 * per-class part, which no ticket now owns. Repeating the preview's numbers here would make the page
 * insist on something the database does not say.
 */
export const describeAssignmentResult = (result: { classesScheduled: number; activitiesCreated: number }): string =>
    `${pluralise(result.activitiesCreated, 'activity', 'activities')} added across ${pluralise(result.classesScheduled, 'class', 'classes')}.`;

/**
 * Whether this school has already scheduled, and is therefore reading a record rather than an offer
 * (LEA-6700).
 *
 * **Asked before {@link hasSomethingToSchedule}, never beside it.** Both of the other states claim a
 * school that has already run, and each is wrong in a way a leader cannot recover from:
 *
 *   - the empty state catches it immediately, because a school holding every topic has nothing left
 *     to create, so `activitiesToCreate` is zero and the page would say there is nothing for them
 *     moments after they succeeded;
 *   - the action catches it as soon as a teacher deletes one of their class's topics, which lifts
 *     that count back above zero and would offer the button to a school that has already run.
 */
export const hasBeenScheduled = (preview?: IWholeSchoolSequencePreview | null): boolean => Boolean(preview?.assignment);

/**
 * What the leader is told above the record of what their school was given (LEA-6700).
 *
 * Counted from the class assignments the run created rather than from anything the preview holds,
 * for the reason {@link describeAssignmentResult} gives: the two legitimately differ, and the record
 * has to say what the database says.
 */
export const describeAssignmentRecord = (record: IWholeSchoolAssignmentRecord, formatDate: FormatDate): string => {
    const scheduled = `${pluralise(record.activitiesCreated, 'activity', 'activities')} across ${pluralise(
        record.classesScheduled,
        'class',
        'classes'
    )}`;

    /*
     * The date is shown when it survived formatting and simply left out when it did not, rather than
     * rendering "on Invalid Date". The counts are the part of this sentence that matters.
     */
    const on = record.scheduledOn ? formatDate(record.scheduledOn) : null;

    return on ? `${scheduled}, scheduled on ${on}.` : `${scheduled}.`;
};

/**
 * The Year groups and Scheduled dates cells of a scheduled programme's summary row, on the Auto
 * schedule tab (LEA-6687).
 *
 * Year groups read as a range only when there is no gap in them, so "Reception - Year 6" never claims
 * a year group the school was not given. Year group ids run in school order, which is what makes a
 * gap detectable. The dates span every row, because that is the whole school's schedule.
 */
export const summariseAssignmentRecord = (
    record: IWholeSchoolAssignmentSummary,
    formatDate: FormatDate
): { yearGroups: string; dates: string } => {
    const rows = [...record.rows].sort((first, second) => Number(first.yearGroupId) - Number(second.yearGroupId));
    const hasNoGap = rows.every((row, index) => index === 0 || Number(row.yearGroupId) === Number(rows[index - 1].yearGroupId) + 1);

    const yearGroups =
        rows.length > 1 && hasNoGap
            ? `${rows[0].yearGroup} - ${rows[rows.length - 1].yearGroup}`
            : rows.map((row) => row.yearGroup).join(', ');

    // Dates arrive as YYYY-MM-DD, so they sort as strings.
    const starts = rows
        .map((row) => row.startDate)
        .filter(Boolean)
        .sort() as string[];
    const ends = rows
        .map((row) => row.endDate ?? row.startDate)
        .filter(Boolean)
        .sort() as string[];

    if (!starts.length) return { yearGroups, dates: 'No dates yet' };

    const start = formatDate(starts[0]);
    const end = formatDate(ends[ends.length - 1]);

    return { yearGroups, dates: start === end ? start : `${start} to ${end}` };
};
