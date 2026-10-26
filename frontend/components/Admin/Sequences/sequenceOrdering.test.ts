import { SequenceTimingMode } from 'lwp-shared';
import { describe, expect, test } from 'vitest';

import {
    describeTiming,
    findOrderErrors,
    findOverlapWarnings,
    findReversedWindowErrors,
    findSequenceDateFindings,
    groupFindingsByTopic,
    parseDateOnly,
    SequenceDraftItem,
    sortItemsByStartDate,
    toDateOnly
} from './sequenceOrdering';

/** A stub stand-in for showDate({ date, short: true }), so the tests assert copy without formatting noise. */
const formatDate = (date: string) => date;

const item = (topicName: string, startDate: string, endDate: string): SequenceDraftItem => ({
    topicId: `topic-${topicName}`,
    topicName,
    startDate,
    endDate
});

describe('toDateOnly', () => {
    test.each([null, undefined, ''])('returns the empty string for %o', (given) => {
        expect(toDateOnly(given)).toBe('');
    });

    test('zero-pads an unpadded date string, so dates compare chronologically as strings', () => {
        expect(toDateOnly('2026-9-1')).toBe('2026-09-01');
    });

    test('leaves an already padded date string alone', () => {
        expect(toDateOnly('2026-09-01')).toBe('2026-09-01');
    });

    test('strips a time portion', () => {
        expect(toDateOnly('2026-09-01T13:45:00.000Z')).toBe('2026-09-01');
    });

    test('reads a Date in local time, so the day is not shifted by the timezone', () => {
        expect(toDateOnly(new Date(2026, 8, 1))).toBe('2026-09-01');
    });

    test('returns the empty string for an invalid Date', () => {
        expect(toDateOnly(new Date('not a date'))).toBe('');
    });
});

describe('parseDateOnly', () => {
    test.each([null, undefined, '', 'nonsense'])('returns null for %o', (given) => {
        expect(parseDateOnly(given)).toBeNull();
    });

    test('builds a local Date, so the picker does not render the previous day', () => {
        const parsed = parseDateOnly('2026-09-01');

        expect([parsed?.getFullYear(), parsed?.getMonth(), parsed?.getDate()]).toEqual([2026, 8, 1]);
    });

    test('round-trips through toDateOnly', () => {
        expect(toDateOnly(parseDateOnly('2026-09-01'))).toBe('2026-09-01');
    });
});

describe('sortItemsByStartDate', () => {
    test('orders by start date, as the server does when it settles a fixed sequence', () => {
        const sorted = sortItemsByStartDate([item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')]);

        expect(sorted.map((i) => i.topicName)).toEqual(['Dragons', 'Sea']);
    });

    test('sinks topics with no start date to the bottom rather than the top', () => {
        const sorted = sortItemsByStartDate([item('New', '', ''), item('Dragons', '2026-09-01', '2026-09-30')]);

        expect(sorted.map((i) => i.topicName)).toEqual(['Dragons', 'New']);
    });

    test('is stable, so topics sharing a start date keep the arranged order', () => {
        const sorted = sortItemsByStartDate([item('Second', '2026-09-01', '2026-09-30'), item('First', '2026-09-01', '2026-09-15')]);

        expect(sorted.map((i) => i.topicName)).toEqual(['Second', 'First']);
    });

    test('does not mutate the given list', () => {
        const items = [item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')];

        sortItemsByStartDate(items);

        expect(items.map((i) => i.topicName)).toEqual(['Sea', 'Dragons']);
    });
});

describe('findOrderErrors', () => {
    test('reports a topic dragged above one that starts earlier', () => {
        const errors = findOrderErrors([item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')], formatDate);

        expect(errors).toEqual([
            {
                topicId: 'topic-Sea',
                message: 'Sea starts 2026-11-01 but sits above Dragons, which starts 2026-09-01. Change the dates to match this order.'
            }
        ]);
    });

    test('reports nothing when the dates already match the order', () => {
        const errors = findOrderErrors([item('Dragons', '2026-09-01', '2026-09-30'), item('Sea', '2026-11-01', '2026-11-30')], formatDate);

        expect(errors).toEqual([]);
    });

    test('treats topics sharing a start date as in order', () => {
        const errors = findOrderErrors([item('Dragons', '2026-09-01', '2026-09-30'), item('Sea', '2026-09-01', '2026-10-02')], formatDate);

        expect(errors).toEqual([]);
    });

    test('skips pairs where a start date has not been set yet', () => {
        const errors = findOrderErrors([item('Sea', '2026-11-01', '2026-11-30'), item('New', '', '')], formatDate);

        expect(errors).toEqual([]);
    });

    test('still compares open-ended topics, since the order comes from the start dates', () => {
        const errors = findOrderErrors([item('Sea', '2026-11-01', ''), item('Dragons', '2026-09-01', '')], formatDate);

        expect(errors).toHaveLength(1);
    });

    test('anchors the error to the topic that is out of place, not the one below it', () => {
        const errors = findOrderErrors([item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')], formatDate);

        expect(errors[0].topicId).toBe('topic-Sea');
    });

    test('reports every offending adjacent pair', () => {
        const errors = findOrderErrors(
            [
                item('Third', '2026-11-01', '2026-11-30'),
                item('Second', '2026-10-01', '2026-10-30'),
                item('First', '2026-09-01', '2026-09-30')
            ],
            formatDate
        );

        expect(errors).toHaveLength(2);
    });
});

describe('findOverlapWarnings', () => {
    test('names the later topic first and states the consequence', () => {
        const warnings = findOverlapWarnings(
            [item('Dragons', '2026-09-01', '2026-09-30'), item('Sea', '2026-09-15', '2026-10-02')],
            formatDate
        );

        expect(warnings).toEqual([
            {
                topicId: 'topic-Sea',
                message:
                    'Sea (2026-09-15 to 2026-10-02) overlaps Dragons (2026-09-01 to 2026-09-30), ' +
                    "so a class will have both topics running at once. That's fine if you meant it, or you can adjust the dates."
            }
        ]);
    });

    test('does not warn on back-to-back windows, which interval mode generates', () => {
        const warnings = findOverlapWarnings(
            [item('Dragons', '2026-09-01', '2026-09-14'), item('Sea', '2026-09-15', '2026-09-28')],
            formatDate
        );

        expect(warnings).toEqual([]);
    });

    test('warns when two topics share a start date, which overlaps by definition', () => {
        const warnings = findOverlapWarnings(
            [item('Dragons', '2026-09-01', '2026-09-30'), item('Sea', '2026-09-01', '2026-09-05')],
            formatDate
        );

        expect(warnings).toHaveLength(1);
    });

    test('anchors the warning to the lower topic, so it is not repeated on both rows', () => {
        const warnings = findOverlapWarnings(
            [item('Dragons', '2026-09-01', '2026-09-30'), item('Sea', '2026-09-15', '2026-10-02')],
            formatDate
        );

        expect(warnings[0].topicId).toBe('topic-Sea');
    });

    test('catches a non-adjacent overlap, where a long topic spans a later one', () => {
        const warnings = findOverlapWarnings(
            [
                item('Long', '2026-09-01', '2026-12-31'),
                item('Middle', '2026-10-01', '2026-10-05'),
                item('Late', '2026-11-01', '2026-11-05')
            ],
            formatDate
        );

        expect(warnings).toHaveLength(2);
    });

    test('does not warn against an open-ended topic, since there is no end to compare', () => {
        const warnings = findOverlapWarnings([item('Open', '2026-09-01', ''), item('Sea', '2026-09-15', '2026-10-02')], formatDate);

        expect(warnings).toEqual([]);
    });

    test('ignores topics whose window is incomplete', () => {
        const warnings = findOverlapWarnings([item('Dragons', '2026-09-01', '2026-09-30'), item('New', '2026-09-15', '')], formatDate);

        expect(warnings).toEqual([]);
    });
});

describe('findReversedWindowErrors', () => {
    test('reports a topic that ends before it starts, which the server rejects', () => {
        const errors = findReversedWindowErrors([item('Dragons', '2026-09-30', '2026-09-01')], formatDate);

        expect(errors).toEqual([
            { topicId: 'topic-Dragons', message: 'Dragons ends 2026-09-01 but starts 2026-09-30. A topic cannot end before it starts.' }
        ]);
    });

    test('accepts a single-day window', () => {
        expect(findReversedWindowErrors([item('Dragons', '2026-09-01', '2026-09-01')], formatDate)).toEqual([]);
    });

    test('accepts an open-ended topic, which cannot end before it starts', () => {
        expect(findReversedWindowErrors([item('Dragons', '2026-09-01', '')], formatDate)).toEqual([]);
    });
});

describe('describeTiming', () => {
    test('names the mode for a fixed sequence, whose dates live on its topics', () => {
        expect(describeTiming({ timingMode: SequenceTimingMode.FIXED, intervalDays: null })).toBe('Fixed dates');
    });

    // The cadence is the useful part, so it is shown rather than the mode's name.
    test('gives the cadence for an interval sequence', () => {
        expect(describeTiming({ timingMode: SequenceTimingMode.INTERVAL, intervalDays: 7 })).toBe('Every 7 days');
    });

    test('says day rather than days for a cadence of one', () => {
        expect(describeTiming({ timingMode: SequenceTimingMode.INTERVAL, intervalDays: 1 })).toBe('Every 1 day');
    });

    /*
     * A cadence is required of a new interval sequence, so a missing one means a row saved before
     * that rule existed. Naming the mode is honest about knowing nothing more; claiming a length
     * would not be.
     */
    test('falls back to the mode when an interval sequence carries no cadence', () => {
        expect(describeTiming({ timingMode: SequenceTimingMode.INTERVAL, intervalDays: null })).toBe('Interval');
    });

    // A fixed sequence never has one, so this proves the mode decides and the value is not read.
    test('ignores a cadence on a fixed sequence', () => {
        expect(describeTiming({ timingMode: SequenceTimingMode.FIXED, intervalDays: 7 })).toBe('Fixed dates');
    });
});

describe('groupFindingsByTopic', () => {
    test('groups by topic, so a row can render the findings that belong to it', () => {
        const grouped = groupFindingsByTopic([
            { topicId: 'a', message: 'first' },
            { topicId: 'b', message: 'second' },
            { topicId: 'a', message: 'third' }
        ]);

        expect(grouped).toEqual({ a: ['first', 'third'], b: ['second'] });
    });

    test('returns an empty object when there is nothing to report', () => {
        expect(groupFindingsByTopic([])).toEqual({});
    });
});

describe('findSequenceDateFindings', () => {
    test('checks nothing for an interval sequence, which generates its own windows', () => {
        const findings = findSequenceDateFindings(
            [item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')],
            false,
            formatDate
        );

        expect(findings).toEqual({ errors: [], warnings: [] });
    });

    test('separates blocking order errors from non-blocking overlap warnings', () => {
        const findings = findSequenceDateFindings(
            [item('Sea', '2026-09-15', '2026-10-02'), item('Dragons', '2026-09-01', '2026-09-30')],
            true,
            formatDate
        );

        expect(findings.errors).toHaveLength(1);
        expect(findings.warnings).toHaveLength(1);
    });

    test('reports a reversed window alongside an order error', () => {
        const findings = findSequenceDateFindings(
            [item('Sea', '2026-11-30', '2026-11-01'), item('Dragons', '2026-09-01', '2026-09-30')],
            true,
            formatDate
        );

        expect(findings.errors).toHaveLength(2);
    });
});
