import { WholeSchoolYearGroupSkipReason } from 'lwp-shared';
import moment from 'moment';
import { describe, expect, test } from 'vitest';

import { IWholeSchoolSequencePreview, IWholeSchoolSequencePreviewRow } from '../../../types/entities/IWholeSchoolSequencePreview';
import {
    describeAssignmentRecord,
    describeAssignmentResult,
    describePreviewSummary,
    describeRowSkippedTopics,
    formatRowDates,
    hasBeenScheduled,
    hasSomethingToSchedule,
    isRowCompleted,
    skipReasonExplanation,
    skipReasonLabel,
    summariseAssignmentRecord
} from './wholeSchoolPreview';

/** Dates are compared as strings, so the tests only need them readable, not formatted. */
const formatDate = (date: string) => date;

const row = (overrides: Partial<IWholeSchoolSequencePreviewRow> = {}): IWholeSchoolSequencePreviewRow => ({
    yearGroupId: '0',
    yearGroup: 'Reception',
    sequenceName: 'Money Skills Reception',
    startDate: '2026-09-07',
    endDate: '2026-10-16',
    classCount: 2,
    topicsSkipped: 0,
    skipped: false,
    ...overrides
});

const preview = (overrides: Partial<IWholeSchoolSequencePreview> = {}): IWholeSchoolSequencePreview => ({
    wholeSchoolSequenceId: '7',
    subjectId: '4',
    subjectName: 'Money Skills',
    academicYear: '2026-27',
    rows: [row()],
    activitiesToCreate: 6,
    topicsSkipped: 0,
    classesCovered: 2,
    classesSkipped: 0,
    ...overrides
});

describe('formatRowDates', () => {
    test('shows the span a year group would be given', () => {
        expect(formatRowDates(row(), formatDate)).toEqual('2026-09-07 to 2026-10-16');
    });

    test('shows one date when the sequence starts and ends on the same day', () => {
        expect(formatRowDates(row({ endDate: '2026-09-07' }), formatDate)).toEqual('2026-09-07');
    });

    test('shows one date when there is no end date at all', () => {
        expect(formatRowDates(row({ endDate: null }), formatDate)).toEqual('2026-09-07');
    });

    test('shows no dates on a skipped row, because nothing will exist on them', () => {
        expect(formatRowDates(row({ skipped: true, skipReason: WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES }), formatDate)).toEqual(
            'Not being scheduled'
        );
    });

    test('says so rather than rendering an empty span when a member carries no dates', () => {
        expect(formatRowDates(row({ startDate: null, endDate: null }), formatDate)).toEqual('No dates yet');
    });
});

describe('skip reasons', () => {
    test('tells the two skips apart in the chip', () => {
        expect(skipReasonLabel(WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP)).toEqual('No topics yet');
        expect(skipReasonLabel(WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES)).toEqual('No classes');
    });

    test('falls back to something true rather than blank for a reason it does not know', () => {
        expect(skipReasonLabel(null)).toEqual('Skipped');
        expect(skipReasonExplanation(null)).toEqual('Nothing will be scheduled for this year group.');
    });

    test('says whose problem each skip is', () => {
        // Not the school's to fix: the content is not ready.
        expect(skipReasonExplanation(WholeSchoolYearGroupSkipReason.NO_SEQUENCE_FOR_YEAR_GROUP)).toContain('no topics for this year group');
        // Possibly the school's to fix: a class is not set up for the programme.
        expect(skipReasonExplanation(WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES)).toContain('no classes set up for this programme');
    });
});

describe('describePreviewSummary', () => {
    test('states what will be created and where', () => {
        expect(describePreviewSummary(preview())).toEqual('6 activities will be added across 2 classes.');
    });

    test('keeps the numbers reconciled with the rows, including the skipped ones', () => {
        const summary = describePreviewSummary(preview({ classesSkipped: 1 }));

        expect(summary).toContain('6 activities will be added across 2 classes.');
        expect(summary).toContain('1 class will not be given anything');
    });

    test('reads as English for a single class and a single activity', () => {
        expect(describePreviewSummary(preview({ activitiesToCreate: 1, classesCovered: 1 }))).toEqual(
            '1 activity will be added across 1 class.'
        );
    });

    test('says nothing about skipped classes when there are none', () => {
        expect(describePreviewSummary(preview())).not.toContain('will not be given anything');
    });
});

describe('describeAssignmentResult', () => {
    test('reports what was written, not what the preview predicted', () => {
        expect(describeAssignmentResult({ classesScheduled: 5, activitiesCreated: 15 })).toEqual('15 activities added across 5 classes.');
    });

    test('reads as English for a single class and a single activity', () => {
        expect(describeAssignmentResult({ classesScheduled: 1, activitiesCreated: 1 })).toEqual('1 activity added across 1 class.');
    });

    test('is honest when a class was left out, rather than repeating the preview total', () => {
        // A class that already held everything it would be given is dropped from the run, so the
        // result legitimately falls short of the preview. The message has to follow the result.
        expect(describeAssignmentResult({ classesScheduled: 4, activitiesCreated: 8 })).toEqual('8 activities added across 4 classes.');
    });
});

describe('hasSomethingToSchedule', () => {
    test('is true when a published sequence would create something', () => {
        expect(hasSomethingToSchedule(preview())).toBe(true);
    });

    test('is false when nothing is published for this school year', () => {
        expect(hasSomethingToSchedule(preview({ wholeSchoolSequenceId: null, rows: [], activitiesToCreate: 0 }))).toBe(false);
    });

    test('is false when something is published but this school would get nothing from it', () => {
        expect(
            hasSomethingToSchedule(
                preview({
                    rows: [row({ skipped: true, skipReason: WholeSchoolYearGroupSkipReason.NO_ELIGIBLE_CLASSES, classCount: 0 })],
                    activitiesToCreate: 0,
                    classesCovered: 0
                })
            )
        ).toBe(false);
    });

    test('is false rather than throwing when the query has not answered yet', () => {
        expect(hasSomethingToSchedule(undefined)).toBe(false);
        expect(hasSomethingToSchedule(null)).toBe(false);
    });
});

/**
 * The sentence a row carries when it is still being scheduled but has dropped topics whose dates
 * have gone.
 */
describe('describeRowSkippedTopics', () => {
    test('says how many went and why', () => {
        expect(describeRowSkippedTopics(row({ topicsSkipped: 2 }))).toEqual('2 topics skipped, their dates have passed.');
    });

    test('reads as English for a single topic', () => {
        expect(describeRowSkippedTopics(row({ topicsSkipped: 1 }))).toEqual('1 topic skipped, its date has passed.');
    });

    test('says nothing at all when the row is losing nothing', () => {
        expect(describeRowSkippedTopics(row({ topicsSkipped: 0 }))).toBeNull();
    });

    test('says nothing on a skipped row, which already carries its own reason', () => {
        const allPast = row({
            skipped: true,
            skipReason: WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST,
            topicsSkipped: 3
        });

        // Two sentences about the same thing would read as two separate problems.
        expect(describeRowSkippedTopics(allPast)).toBeNull();
    });
});

describe('the all-topics-in-past skip', () => {
    test('has a chip of its own, so it is not confused with missing content', () => {
        expect(skipReasonLabel(WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST)).toEqual('Dates passed');
    });

    test('explains that the dates have gone rather than that something is wrong', () => {
        expect(skipReasonExplanation(WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST)).toContain('dated in the past');
    });

    test('shows no span, because there is nothing left to span', () => {
        const allPast = row({ skipped: true, skipReason: WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST });

        expect(formatRowDates(allPast, formatDate)).toEqual('Not being scheduled');
    });
});

describe('describePreviewSummary, with past-dated topics', () => {
    test('states the skipped topics, and they are the sum of the rows', () => {
        const summary = describePreviewSummary(preview({ activitiesToCreate: 4, topicsSkipped: 2, rows: [row({ topicsSkipped: 2 })] }));

        expect(summary).toEqual(
            '4 activities will be added across 2 classes. 2 topics are not being scheduled, because their dates have passed.'
        );
    });

    test('reads as English for a single topic', () => {
        const summary = describePreviewSummary(preview({ activitiesToCreate: 5, topicsSkipped: 1, rows: [row({ topicsSkipped: 1 })] }));

        // Singular all the way through: "1 topic is ... their dates" reads as a bug to anyone who
        // notices it, and a leader losing exactly one topic is the commonest case of all.
        expect(summary).toContain('1 topic is not being scheduled, because its date has passed.');
    });

    test('says nothing about skipped topics when none were', () => {
        expect(describePreviewSummary(preview())).toEqual('6 activities will be added across 2 classes.');
    });

    test('states how many classes get nothing, without guessing at one reason for all of them', () => {
        const summary = describePreviewSummary(
            preview({
                activitiesToCreate: 0,
                topicsSkipped: 3,
                classesCovered: 0,
                classesSkipped: 2,
                rows: [
                    row({
                        topicsSkipped: 3,
                        skipped: true,
                        skipReason: WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST
                    })
                ]
            })
        );

        /*
         * The sentence carries the count and stops there. Naming one reason was only ever right
         * while there was one, and each row states its own, which is where reasons that differ per
         * year group belong.
         */
        expect(summary).toContain('2 classes will not be given anything.');
        expect(summary).not.toContain('because there are no topics');
    });

    test('reports the skipped topics the server counted, without re-deciding which rows qualify', () => {
        /*
         * The server excludes rows where a date is not the story. Passing a total that disagrees
         * with the rows proves the sentence is built from the server's figure and not recomputed.
         */
        const summary = describePreviewSummary(
            preview({
                topicsSkipped: 1,
                rows: [row({ topicsSkipped: 4, skipped: true, skipReason: WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS })]
            })
        );

        expect(summary).toContain('1 topic is not being scheduled, because its date has passed.');
        expect(summary).not.toContain('4 topics');
    });
});

describe('the skips no one at the school can act on', () => {
    test('tells unavailable content apart from a date that has passed', () => {
        expect(skipReasonLabel(WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS)).toEqual('Not available');
        expect(skipReasonExplanation(WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS)).toContain('not available yet');
    });

    test('says a year group already has these topics, rather than that something was refused', () => {
        expect(skipReasonLabel(WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS)).toEqual('Already added');
        expect(skipReasonExplanation(WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS)).toContain(
            'already have all of these topics'
        );
    });

    test('shows no dates on either, because nothing will exist on them', () => {
        const unavailable = row({ skipped: true, skipReason: WholeSchoolYearGroupSkipReason.NO_AVAILABLE_TOPICS });
        const alreadyHas = row({ skipped: true, skipReason: WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS });

        expect(formatRowDates(unavailable, formatDate)).toEqual('Not being scheduled');
        expect(formatRowDates(alreadyHas, formatDate)).toEqual('Not being scheduled');
    });

    test('says nothing about skipped topics on an already-added row, which lost none to its dates', () => {
        const alreadyHas = row({ skipped: true, skipReason: WholeSchoolYearGroupSkipReason.ALREADY_HAS_THESE_TOPICS, topicsSkipped: 0 });

        expect(describeRowSkippedTopics(alreadyHas)).toBeNull();
    });
});

/**
 * The state a school is in once it has scheduled, which has to be decided before either of the
 * other two claims it.
 */
describe('hasBeenScheduled', () => {
    const record = {
        assignmentId: '55',
        scheduledOn: '2026-09-14',
        rows: [row()],
        activitiesCreated: 6,
        classesScheduled: 2
    };

    test('is true once the school has a record of having scheduled', () => {
        expect(hasBeenScheduled(preview({ assignment: record }))).toBe(true);
    });

    test('is false for a school that has not', () => {
        expect(hasBeenScheduled(preview())).toBe(false);
    });

    /*
     * The case that matters. Since the activity count became exact, a school holding every topic it
     * would be given reports nothing left to create, and without this the page tells it there is
     * nothing for it moments after it succeeded.
     */
    test('is true even though the school now has nothing left to create', () => {
        const scheduled = preview({
            assignment: record,
            wholeSchoolSequenceId: null,
            rows: [],
            activitiesToCreate: 0,
            classesCovered: 0
        });

        expect(hasBeenScheduled(scheduled)).toBe(true);
        expect(hasSomethingToSchedule(scheduled)).toBe(false);
    });

    /*
     * The other way this used to go wrong. A teacher deleting one of their class's topics lifts the
     * count back above zero, which would offer the button again to a school that has already run.
     */
    test('still beats the action when a deleted topic leaves something to create', () => {
        const scheduled = preview({ assignment: record, activitiesToCreate: 2 });

        expect(hasBeenScheduled(scheduled)).toBe(true);
        expect(hasSomethingToSchedule(scheduled)).toBe(true);
    });

    test('is false rather than throwing when the query has not answered yet', () => {
        expect(hasBeenScheduled(undefined)).toBe(false);
        expect(hasBeenScheduled(null)).toBe(false);
    });
});

/** What the leader is told above the record of what their school was given. */
describe('describeAssignmentRecord', () => {
    const record = (overrides = {}) => ({
        assignmentId: '55',
        scheduledOn: '2026-09-14',
        rows: [row()],
        activitiesCreated: 6,
        classesScheduled: 2,
        ...overrides
    });

    test('states what was created, and when', () => {
        expect(describeAssignmentRecord(record(), formatDate)).toEqual('6 activities across 2 classes, scheduled on 2026-09-14.');
    });

    test('reads correctly for one of each', () => {
        expect(describeAssignmentRecord(record({ activitiesCreated: 1, classesScheduled: 1 }), formatDate)).toEqual(
            '1 activity across 1 class, scheduled on 2026-09-14.'
        );
    });

    // The counts are the part that matters, so a missing date drops the clause rather than the line.
    test('leaves the date out rather than rendering an empty one', () => {
        expect(describeAssignmentRecord(record({ scheduledOn: null }), formatDate)).toEqual('6 activities across 2 classes.');
    });
});

describe('summariseAssignmentRecord', () => {
    const summaryRow = (yearGroupId: string, yearGroup: string, startDate: string | null, endDate: string | null) =>
        row({ yearGroupId, yearGroup, startDate, endDate });

    test('reads unbroken year groups as a range, spanning every row', () => {
        const summary = summariseAssignmentRecord(
            {
                rows: [
                    summaryRow('1', 'Year 1', '2026-09-14', '2026-10-30'),
                    summaryRow('0', 'Reception', '2026-09-07', '2026-10-16'),
                    summaryRow('2', 'Year 2', '2026-09-21', '2026-11-06')
                ]
            },
            formatDate
        );

        expect(summary).toEqual({ yearGroups: 'Reception - Year 2', dates: '2026-09-07 to 2026-11-06' });
    });

    // A range would claim Year 1 was scheduled when it was not.
    test('lists year groups with a gap in them rather than claiming a range', () => {
        const summary = summariseAssignmentRecord(
            { rows: [summaryRow('0', 'Reception', '2026-09-07', '2026-10-16'), summaryRow('2', 'Year 2', '2026-09-21', null)] },
            formatDate
        );

        expect(summary).toEqual({ yearGroups: 'Reception, Year 2', dates: '2026-09-07 to 2026-10-16' });
    });

    test('says there are no dates rather than rendering an empty cell', () => {
        expect(summariseAssignmentRecord({ rows: [summaryRow('3', 'Year 3', null, null)] }, formatDate)).toEqual({
            yearGroups: 'Year 3',
            dates: 'No dates yet'
        });
    });
});

describe('isRowCompleted', () => {
    // Built relative to today, or the suite starts passing for the wrong reason next September.
    const daysAway = (days: number) => moment().add(days, 'days').format('YYYY-MM-DD');

    test('a year group whose last topic has gone is finished', () => {
        expect(isRowCompleted(row({ startDate: daysAway(-40), endDate: daysAway(-1) }))).toBe(true);
    });

    // The topic is still open to pupils on its due date, so it is the one they are working on.
    test('a row ending today is not finished yet', () => {
        expect(isRowCompleted(row({ startDate: daysAway(-40), endDate: daysAway(0) }))).toBe(false);
    });

    test('a row still to come is not finished', () => {
        expect(isRowCompleted(row({ startDate: daysAway(7), endDate: daysAway(40) }))).toBe(false);
    });

    test('a row under way is not finished', () => {
        expect(isRowCompleted(row({ startDate: daysAway(-7), endDate: daysAway(7) }))).toBe(false);
    });

    // A one-topic sequence closes on its start date, the same fallback formatRowDates uses.
    test('falls back to the start date when there is no end date', () => {
        expect(isRowCompleted(row({ startDate: daysAway(-1), endDate: null }))).toBe(true);
        expect(isRowCompleted(row({ startDate: daysAway(1), endDate: null }))).toBe(false);
    });

    test('a row with no dates at all is not finished', () => {
        expect(isRowCompleted(row({ startDate: null, endDate: null }))).toBe(false);
    });

    // Skipped means it was never scheduled, so there is nothing for it to have finished.
    test('a skipped row is never finished, however old its dates', () => {
        const skipped = row({
            skipped: true,
            skipReason: WholeSchoolYearGroupSkipReason.ALL_TOPICS_IN_PAST,
            startDate: daysAway(-40),
            endDate: daysAway(-1)
        });

        expect(isRowCompleted(skipped)).toBe(false);
    });
});
