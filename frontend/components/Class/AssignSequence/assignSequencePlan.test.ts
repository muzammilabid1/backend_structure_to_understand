import { SequenceItemSkipReason, SequenceTimingMode } from 'lwp-shared';
import moment from 'moment';
import { describe, expect, test } from 'vitest';

import { ISequenceAssignmentPlanItem, SequenceDateOverrides } from '../../../types/entities/ISequenceAssignmentPlan';
import { IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';
import {
    defaultStartDateForSequence,
    describePlanSummary,
    findRowDateErrors,
    isOverridden,
    needsStartDate,
    resolveRowDates,
    skipReasonExplanation,
    skipReasonLabel,
    templatePlanItems,
    toValidOverrideInputs
} from './assignSequencePlan';

const TODAY = '2026-08-04';

/** Dates are compared as strings, so the tests only need them to be readable, not formatted. */
const formatDate = (date: string) => date;

/**
 * Shifting is asserted by its invariants rather than by hand-computed dates: what matters is that
 * every topic moves by one offset and every window keeps its length, whatever the month lengths and
 * year boundaries in between happen to do.
 */
const daysBetween = (from: string, to: string) => moment(to, 'YYYY-MM-DD').diff(moment(from, 'YYYY-MM-DD'), 'days');

const planItem = (overrides: Partial<ISequenceAssignmentPlanItem> & { id: string; name?: string }): ISequenceAssignmentPlanItem => ({
    topic: { id: overrides.id, teacherTopicName: overrides.name ?? `Topic ${overrides.id}` },
    order: overrides.order ?? 1,
    // Checked for presence rather than defaulted, as the due date is, so a test can ask for the
    // undated row a skipped or dropped topic now produces. The server never dates one: it is not
    // being created, and on an interval sequence the slot it would have held has gone to the topic
    // below it.
    releaseDate: 'releaseDate' in overrides ? overrides.releaseDate : '2026-09-01',
    // Checked for presence rather than defaulted, so a test can ask for an open window by passing
    // an explicit null without it being swallowed by the default.
    dueDate: 'dueDate' in overrides ? overrides.dueDate : '2026-09-30',
    skipped: overrides.skipped ?? false,
    skipReason: overrides.skipReason ?? null,
    alreadyScheduled: overrides.alreadyScheduled ?? false,
    excluded: overrides.excluded ?? false
});

/**
 * A row the server will not be creating, in the shape it actually arrives in: no dates at all.
 *
 * Both reasons produce the same shape, since a skip and a drop differ in who decided rather than in
 * what the class gets, and neither can hold a slot an interval sequence dates by position.
 */
const undatedItem = (id: string, reason: 'skipped' | 'excluded'): ISequenceAssignmentPlanItem =>
    planItem({
        id,
        releaseDate: null,
        dueDate: null,
        skipped: reason === 'skipped',
        skipReason: reason === 'skipped' ? SequenceItemSkipReason.ALREADY_SCHEDULED : null,
        excluded: reason === 'excluded'
    });

describe('skipReasonLabel and skipReasonExplanation', () => {
    test('names both reasons in words a leader would use', () => {
        expect(skipReasonLabel(SequenceItemSkipReason.ALREADY_SCHEDULED)).toBe('Already scheduled');
        expect(skipReasonLabel(SequenceItemSkipReason.CONTENT_UNAVAILABLE)).toBe('Content unavailable');
    });

    test('falls back rather than showing an enum value if a new reason is added server-side', () => {
        expect(skipReasonLabel(null)).toBe('Skipped');
        expect(skipReasonExplanation(null)).toBe('This topic will not be scheduled.');
    });

    test('explains why the topic is being left out', () => {
        expect(skipReasonExplanation(SequenceItemSkipReason.ALREADY_SCHEDULED)).toContain('already has this topic');
        expect(skipReasonExplanation(SequenceItemSkipReason.CONTENT_UNAVAILABLE)).toContain('not currently available');
    });
});

describe('describePlanSummary', () => {
    test('reconciles the counts with the rows on screen', () => {
        expect(describePlanSummary(5, 2)).toBe('5 topics will be added, 2 skipped.');
    });

    test('says nothing about skips when there are none', () => {
        expect(describePlanSummary(7, 0)).toBe('7 topics will be added.');
    });

    test('reads singular for one topic', () => {
        expect(describePlanSummary(1, 0)).toBe('1 topic will be added.');
    });

    test('is explicit when everything is being skipped, since the table looks full but nothing happens', () => {
        expect(describePlanSummary(0, 3)).toBe('Nothing will be added. All 3 topics are being skipped.');
    });

    test('copes with an empty plan', () => {
        expect(describePlanSummary(0, 0)).toBe('Nothing to add.');
    });

    /**
     * Removals are said apart from skips (LEA-6596). A skip is something that happened to the plan
     * and a removal is something the teacher did to it, so one is news and the other a confirmation.
     * A single total would leave them unable to tell whether the count was theirs.
     */
    describe('topics the teacher removed', () => {
        test('counts removals apart from skips', () => {
            expect(describePlanSummary(4, 0, 2)).toBe('4 topics will be added, 2 removed.');
            expect(describePlanSummary(3, 1, 2)).toBe('3 topics will be added, 1 skipped, 2 removed.');
        });

        test('names the cause when there is only one, so an empty list explains itself', () => {
            expect(describePlanSummary(0, 0, 3)).toBe('Nothing will be added. All 3 topics have been removed.');
            expect(describePlanSummary(0, 3, 0)).toBe('Nothing will be added. All 3 topics are being skipped.');
        });

        test('lists the counts when both apply, since there is no single cause to name', () => {
            expect(describePlanSummary(0, 2, 1)).toBe('Nothing will be added: 2 skipped, 1 removed.');
        });

        test('defaults to none, so callers that predate exclusions read exactly as before', () => {
            expect(describePlanSummary(5, 2)).toBe(describePlanSummary(5, 2, 0));
        });
    });
});

describe('defaultStartDateForSequence', () => {
    /*
     * Tomorrow, and it no longer depends on the sequence at all: an interval sequence carries no
     * anchor for an admin to suggest (LEA-6594), so the choice is entirely the teacher's.
     */
    test('offers tomorrow', () => {
        expect(defaultStartDateForSequence(TODAY)).toBe('2026-08-05');
    });

    /**
     * The default and the minimum deliberately differ by one day, so this is asserted rather than
     * left to be read as an off-by-one.
     *
     * The release cron runs every ten minutes and matches `releaseDate <= now`, so a topic dated
     * today goes live within ten minutes, before the teacher has closed the tab. The default guards
     * against that; the floor stays at today so a teacher who wants it live now can still pick it.
     */
    test('is one day later than the earliest date allowed, which is today', () => {
        expect(defaultStartDateForSequence(TODAY) > TODAY).toBe(true);
    });

    test('rolls into the next month, and the next year, rather than overflowing the day', () => {
        expect(defaultStartDateForSequence('2026-08-31')).toBe('2026-09-01');
        expect(defaultStartDateForSequence('2026-12-31')).toBe('2027-01-01');
    });

    test('handles a leap day', () => {
        expect(defaultStartDateForSequence('2028-02-28')).toBe('2028-02-29');
    });

    test('zero-pads, so the date sorts and compares chronologically as a string', () => {
        expect(defaultStartDateForSequence('2026-9-1')).toBe('2026-09-02');
    });
});

describe('needsStartDate', () => {
    test('asks for an anchor only for an interval sequence, which generates its dates from one', () => {
        expect(needsStartDate(SequenceTimingMode.INTERVAL)).toBe(true);
    });

    test('does not ask for one for a fixed sequence, whose items carry their own dates', () => {
        expect(needsStartDate(SequenceTimingMode.FIXED)).toBe(false);
        expect(needsStartDate(undefined)).toBe(false);
    });
});

/*
 * The tests for validateIntervalDays and parseIntervalDays were removed with the functions
 * (LEA-6624). The rule they covered lives on the admin form now and is tested in
 * topicSequenceValidation.test.ts, where a cadence is actually entered.
 */

describe('resolveRowDates', () => {
    test("shows the plan's dates when the leader has not touched the row", () => {
        expect(resolveRowDates(planItem({ id: '1' }), {})).toEqual({ releaseDate: '2026-09-01', dueDate: '2026-09-30' });
    });

    test("shows the leader's dates where they have made an adjustment", () => {
        const overrides: SequenceDateOverrides = { '1': { releaseDate: '2026-10-05', dueDate: '2026-10-20' } };

        expect(resolveRowDates(planItem({ id: '1' }), overrides)).toEqual({ releaseDate: '2026-10-05', dueDate: '2026-10-20' });
    });

    test('shows an adjustment even while it is invalid, rather than reverting what the leader typed', () => {
        const overrides: SequenceDateOverrides = { '1': { releaseDate: '2020-01-01', dueDate: '' } };

        expect(resolveRowDates(planItem({ id: '1' }), overrides).releaseDate).toBe('2020-01-01');
    });

    test('renders a plan item with no due date as an open window rather than as missing data', () => {
        expect(resolveRowDates(planItem({ id: '1', dueDate: null }), {})).toEqual({ releaseDate: '2026-09-01', dueDate: '' });
    });

    // A row the class is not getting has no dates at all, and the table asks this for every row it
    // renders, so it has to come back empty rather than as a bad date string.
    test('renders an undated row as empty rather than as a date', () => {
        expect(resolveRowDates(undatedItem('1', 'skipped'), {})).toEqual({ releaseDate: '', dueDate: '' });
        expect(resolveRowDates(undatedItem('2', 'excluded'), {})).toEqual({ releaseDate: '', dueDate: '' });
    });
});

describe('isOverridden', () => {
    test('is false when the leader has opened a row but left the dates alone', () => {
        const overrides: SequenceDateOverrides = { '1': { releaseDate: '2026-09-01', dueDate: '2026-09-30' } };

        expect(isOverridden(planItem({ id: '1' }), overrides)).toBe(false);
    });

    test('is true once either date differs from the plan', () => {
        expect(isOverridden(planItem({ id: '1' }), { '1': { releaseDate: '2026-09-02', dueDate: '2026-09-30' } })).toBe(true);
        expect(isOverridden(planItem({ id: '1' }), { '1': { releaseDate: '2026-09-01', dueDate: '' } })).toBe(true);
    });

    test('is false when there is no adjustment at all', () => {
        expect(isOverridden(planItem({ id: '1' }), {})).toBe(false);
    });
});

describe('findRowDateErrors', () => {
    const items = [planItem({ id: '1', name: 'Types of money' }), planItem({ id: '2', name: 'Spending and saving' })];

    test('finds nothing when the plan is sound and untouched', () => {
        expect(findRowDateErrors(items, {}, TODAY, formatDate)).toEqual([]);
    });

    /**
     * The case the template fallback exists for: no adjustment has been made, but the dates standing
     * in came from a set an admin dated last year, so the leader has to be told which ones to move.
     */
    test('reports a past date the plan itself carries, not only one the leader typed', () => {
        const stale = [planItem({ id: '1', name: 'Types of money', releaseDate: '2026-01-01', dueDate: '2026-01-31' })];

        const findings = findRowDateErrors(stale, {}, TODAY, formatDate);

        expect(findings).toHaveLength(1);
        expect(findings[0].topicId).toBe('1');
        expect(findings[0].message).toContain('in the past');
    });

    test('clears once the leader has moved a past date forward', () => {
        const stale = [planItem({ id: '1', releaseDate: '2026-01-01', dueDate: '2026-01-31' })];

        expect(findRowDateErrors(stale, { '1': { releaseDate: '2026-09-01', dueDate: '2026-09-30' } }, TODAY, formatDate)).toEqual([]);
    });

    test('accepts an adjustment to today, which is the earliest allowed', () => {
        expect(findRowDateErrors(items, { '1': { releaseDate: TODAY, dueDate: '' } }, TODAY, formatDate)).toEqual([]);
    });

    test('rejects a past start date, anchored to the topic so the row can show it', () => {
        const findings = findRowDateErrors(items, { '1': { releaseDate: '2026-08-03', dueDate: '' } }, TODAY, formatDate);

        expect(findings).toHaveLength(1);
        expect(findings[0].topicId).toBe('1');
        expect(findings[0].message).toContain('Types of money');
        expect(findings[0].message).toContain('in the past');
    });

    test('rejects a window that ends before it starts', () => {
        const findings = findRowDateErrors(items, { '2': { releaseDate: '2026-10-10', dueDate: '2026-10-01' } }, TODAY, formatDate);

        expect(findings).toHaveLength(1);
        expect(findings[0].topicId).toBe('2');
        expect(findings[0].message).toContain('cannot end before it starts');
    });

    test('accepts an open window, exactly as a hand-scheduled topic may have no due date', () => {
        expect(findRowDateErrors(items, { '2': { releaseDate: '2026-10-10', dueDate: '' } }, TODAY, formatDate)).toEqual([]);
    });

    test('rejects an adjustment that clears the start date, since a class topic always has one', () => {
        const findings = findRowDateErrors(items, { '1': { releaseDate: '', dueDate: '' } }, TODAY, formatDate);

        expect(findings[0].message).toContain('needs a start date');
    });

    test('ignores a skipped topic, which is not being created and so cannot have wrong dates', () => {
        const skipped = [planItem({ id: '1', skipped: true, skipReason: SequenceItemSkipReason.ALREADY_SCHEDULED })];

        expect(findRowDateErrors(skipped, { '1': { releaseDate: '2020-01-01', dueDate: '' } }, TODAY, formatDate)).toEqual([]);
    });

    /*
     * The row as the server really sends it now, with no dates on it at all.
     *
     * Worth its own test because of what happens if the `skipped` guard above is ever removed: a
     * missing start date is a blocking error, so a greyed-out row nobody can edit would lock the
     * submit button and demand a date for a topic that is not being created.
     *
     * Dropped rows reach the same end by a different route: the form filters them out before calling
     * this, which is why they are not asserted here.
     */
    test('has nothing to report about an undated skipped row, rather than demanding a start date', () => {
        expect(findRowDateErrors([undatedItem('1', 'skipped')], {}, TODAY, formatDate)).toEqual([]);
    });

    /*
     * The moment after a teacher puts a dropped topic back. The row rejoins the checked set at once,
     * but the plan on screen is the one that did not date it, so for as long as the next preview
     * takes it is an undated row that nobody has touched.
     *
     * It used to report "needs a start date" underneath a row that plainly had dates, and block the
     * action while it did. Nothing is wrong here: there is simply no date yet to be wrong about.
     */
    test('has nothing to report about an undated row nobody has touched, which is a plan not yet caught up', () => {
        expect(findRowDateErrors([undatedItem('1', 'excluded')], {}, TODAY, formatDate)).toEqual([]);
    });

    /*
     * The distinction that keeps the guard above honest. A date the leader cleared themselves leaves
     * an override behind, so it stays the blocking error it has always been rather than being waved
     * through as "not dated yet".
     */
    test('still rejects a row the leader cleared the date on, which is a real problem rather than a stale plan', () => {
        const cleared = findRowDateErrors(
            [planItem({ id: '1', name: 'Types of money' })],
            { '1': { releaseDate: '', dueDate: '' } },
            TODAY,
            formatDate
        );

        expect(cleared).toEqual([{ topicId: '1', message: 'Types of money needs a start date.' }]);
    });

    test('reports every offending topic, so they can all be fixed in one pass', () => {
        const findings = findRowDateErrors(
            items,
            { '1': { releaseDate: '2026-01-01', dueDate: '' }, '2': { releaseDate: '2026-02-01', dueDate: '' } },
            TODAY,
            formatDate
        );

        expect(findings.map((finding) => finding.topicId)).toEqual(['1', '2']);
    });
});

describe('toValidOverrideInputs', () => {
    const items = [planItem({ id: '1' }), planItem({ id: '2' })];

    test('sends nothing when the leader has changed nothing', () => {
        expect(toValidOverrideInputs(items, {}, TODAY)).toEqual([]);
    });

    test('sends a valid adjustment', () => {
        const inputs = toValidOverrideInputs(items, { '1': { releaseDate: '2026-09-07', dueDate: '2026-09-21' } }, TODAY);

        expect(inputs).toEqual([{ topicId: '1', releaseDate: '2026-09-07', dueDate: '2026-09-21' }]);
    });

    test('sends an open window as null, since the DateOnly scalar rejects an empty string', () => {
        const inputs = toValidOverrideInputs(items, { '1': { releaseDate: '2026-09-07', dueDate: '' } }, TODAY);

        expect(inputs).toEqual([{ topicId: '1', releaseDate: '2026-09-07', dueDate: null }]);
    });

    test('holds back an invalid adjustment, which would make the preview throw mid-edit', () => {
        expect(toValidOverrideInputs(items, { '1': { releaseDate: '2020-01-01', dueDate: '' } }, TODAY)).toEqual([]);
        expect(toValidOverrideInputs(items, { '1': { releaseDate: '2026-10-10', dueDate: '2026-10-01' } }, TODAY)).toEqual([]);
    });

    test('still sends the valid adjustments alongside an invalid one', () => {
        const inputs = toValidOverrideInputs(
            items,
            { '1': { releaseDate: '2020-01-01', dueDate: '' }, '2': { releaseDate: '2026-09-07', dueDate: '' } },
            TODAY
        );

        expect(inputs).toEqual([{ topicId: '2', releaseDate: '2026-09-07', dueDate: null }]);
    });

    test('holds back an adjustment that matches the plan, since it would change nothing', () => {
        expect(toValidOverrideInputs(items, { '1': { releaseDate: '2026-09-01', dueDate: '2026-09-30' } }, TODAY)).toEqual([]);
    });

    test('never sends an adjustment for a skipped topic', () => {
        const skipped = [planItem({ id: '1', skipped: true, skipReason: SequenceItemSkipReason.ALREADY_SCHEDULED })];

        expect(toValidOverrideInputs(skipped, { '1': { releaseDate: '2026-09-07', dueDate: '' } }, TODAY)).toEqual([]);
    });
});

/*
 * The planStartDate and shiftPlanDates blocks were removed with the functions (LEA-6625). The bulk
 * shift they covered is gone: re-dating is per row now, or a row is dropped, and both are covered by
 * the findRowDateErrors and toValidOverrideInputs blocks above and by topic-sequencing.spec.ts.
 */

describe('templatePlanItems', () => {
    const sequence = {
        items: [
            { id: 'i2', order: 2, startDate: '2026-10-01', endDate: '2026-10-31', topic: { id: 't2', teacherTopicName: 'Second' } },
            { id: 'i1', order: 1, startDate: '2026-09-01', endDate: '2026-09-30', topic: { id: 't1', teacherTopicName: 'First' } }
        ]
    } as IStaticLwpTopicSequence;

    test("stands in for a refused plan using the sequence's own dates, in order", () => {
        const items = templatePlanItems(sequence);

        expect(items.map((item) => item.topic.id)).toEqual(['t1', 't2']);
        expect(items[0].releaseDate).toBe('2026-09-01');
        expect(items[0].dueDate).toBe('2026-09-30');
    });

    test('reads every row as schedulable, because skips are unknowable without the server', () => {
        expect(templatePlanItems(sequence).every((item) => !item.skipped && item.skipReason === null && !item.alreadyScheduled)).toBe(true);
    });

    test('carries an open-ended item through as a null due date rather than an empty string', () => {
        const open = {
            items: [{ id: 'i1', order: 1, startDate: '2026-09-01', endDate: null, topic: { id: 't1', teacherTopicName: 'Open' } }]
        } as IStaticLwpTopicSequence;

        expect(templatePlanItems(open)[0].dueDate).toBeNull();
    });

    test('has nothing to offer for a sequence with no items, or none loaded', () => {
        expect(templatePlanItems({ items: [] } as unknown as IStaticLwpTopicSequence)).toEqual([]);
        expect(templatePlanItems(undefined)).toEqual([]);
    });

    test('does not mutate the sequence it was given, which Apollo may have frozen', () => {
        const items = Object.freeze([
            Object.freeze({ id: 'i2', order: 2, startDate: '2026-10-01', endDate: null, topic: { id: 't2', teacherTopicName: 'Second' } }),
            Object.freeze({ id: 'i1', order: 1, startDate: '2026-09-01', endDate: null, topic: { id: 't1', teacherTopicName: 'First' } })
        ]);

        expect(() => templatePlanItems({ items } as unknown as IStaticLwpTopicSequence)).not.toThrow();
        expect(items[0].order).toBe(2);
    });
});
