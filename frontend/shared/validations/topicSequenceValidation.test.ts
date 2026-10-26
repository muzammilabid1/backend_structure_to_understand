import { SequenceTimingMode } from 'lwp-shared';
import { describe, expect, test } from 'vitest';

import { topicSequenceValidation } from './index';

const item = (topicName: string, startDate: string, endDate: string) => ({
    topicId: `topic-${topicName}`,
    topicName,
    startDate,
    endDate
});

const fixedForm = (items: ReturnType<typeof item>[]) => ({
    name: 'Money Skills Year 3',
    subjectId: 'subject-1',
    yearGroupId: 'year-3',
    periodIndex: '2026',
    timingMode: SequenceTimingMode.FIXED,
    intervalDays: '',
    items
});

const intervalForm = (overrides: Record<string, unknown>) => ({
    name: 'Money Skills Year 3',
    subjectId: 'subject-1',
    yearGroupId: 'year-3',
    // Empty on purpose. An interval sequence belongs to no academic year, the form does not offer
    // the field, and the API refuses one that carries a year rather than ignoring it.
    periodIndex: '',
    timingMode: SequenceTimingMode.INTERVAL,
    intervalDays: '14',
    items: [item('One', '', '')],
    ...overrides
});

/** The messages Yup produced, or [] when the form is valid. */
const errorsFor = async (values: object): Promise<string[]> => {
    try {
        await topicSequenceValidation.validate(values, { abortEarly: false });

        return [];
    } catch (error) {
        return (error as { errors: string[] }).errors;
    }
};

describe('topicSequenceValidation', () => {
    describe('a fixed sequence', () => {
        test('is valid when every topic has both dates and the order matches them', async () => {
            const errors = await errorsFor(
                fixedForm([item('Dragons', '2026-08-03', '2026-08-08'), item('Sea', '2026-08-09', '2026-08-15')])
            );

            expect(errors).toEqual([]);
        });

        test('stays valid when windows overlap, because overlaps only ever warn', async () => {
            const errors = await errorsFor(
                fixedForm([item('Dragons', '2026-08-03', '2026-08-31'), item('Sea', '2026-08-09', '2026-08-15')])
            );

            expect(errors).toEqual([]);
        });

        test('is invalid while any topic is missing a start date', async () => {
            const errors = await errorsFor(fixedForm([item('Dragons', '2026-08-03', '2026-08-08'), item('Undated', '', '')]));

            expect(errors).toContain('Every topic in a fixed sequence needs a start date.');
        });

        test('is valid when a topic has a start date but no end date', async () => {
            const errors = await errorsFor(fixedForm([item('Dragons', '2026-08-03', ''), item('Sea', '2026-08-09', '2026-08-15')]));

            expect(errors).toEqual([]);
        });

        test('is valid when every topic is open ended', async () => {
            const errors = await errorsFor(fixedForm([item('Dragons', '2026-08-03', ''), item('Sea', '2026-08-09', '')]));

            expect(errors).toEqual([]);
        });

        test('still checks the order when a topic is open ended, since order comes from start dates', async () => {
            const errors = await errorsFor(fixedForm([item('Sea', '2026-11-01', ''), item('Dragons', '2026-09-01', '')]));

            expect(errors).toContain('Change the topic dates so they match the order of the list.');
        });

        test('is invalid when the dates disagree with the order of the list', async () => {
            const errors = await errorsFor(
                fixedForm([item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')])
            );

            expect(errors).toContain('Change the topic dates so they match the order of the list.');
        });

        test('is invalid when a topic ends before it starts', async () => {
            const errors = await errorsFor(fixedForm([item('Dragons', '2026-08-31', '2026-08-01')]));

            expect(errors).toContain('A topic cannot end before it starts.');
        });

        test('needs at least one topic', async () => {
            const errors = await errorsFor(fixedForm([]));

            expect(errors).toContain('Add at least one topic.');
        });

        test('does not require a suggested start date', async () => {
            const errors = await errorsFor(fixedForm([item('Dragons', '2026-08-03', '2026-08-08')]));

            expect(errors).toEqual([]);
        });
    });

    describe('an interval sequence', () => {
        test('is valid with topics and a cadence', async () => {
            expect(await errorsFor(intervalForm({}))).toEqual([]);
        });

        /**
         * The cadence is the whole of an interval sequence's timing, so a sequence saved without one
         * could never be assigned to anything. A teacher is not offered a cadence of their own
         * (LEA-6624), so no school could rescue such a sequence either, which is why this is caught
         * here rather than left to fail at assignment time.
         */
        test('needs a cadence', async () => {
            expect(await errorsFor(intervalForm({ intervalDays: '' }))).toEqual(['Enter a whole number of days, at least 1.']);
            expect(await errorsFor(intervalForm({ intervalDays: '0' }))).toEqual(['Enter a whole number of days, at least 1.']);
        });

        /**
         * Rejected rather than rounded. Half a day is not something a schedule can express, and
         * silently choosing 7 or 8 for the admin would be worse than saying so. The number input
         * accepts it, so the rule is what stops it.
         */
        test('needs whole days', async () => {
            expect(await errorsFor(intervalForm({ intervalDays: '7.5' }))).toEqual(['Enter a whole number of days, at least 1.']);
        });

        /*
         * There is no test here for the anchor being optional, because there is no longer a
         * sequence-level anchor to be optional about: LEA-6586 removed the field from the form and
         * the rule with it. The cadence is the only timing an interval sequence carries.
         */
        test('accepts a cadence of a single day, where every topic runs for one day', async () => {
            expect(await errorsFor(intervalForm({ intervalDays: '1' }))).toEqual([]);
        });

        test('is not held to the fixed-mode date rules, since it carries no dates', async () => {
            const errors = await errorsFor(
                intervalForm({ items: [item('Sea', '2026-11-01', '2026-11-30'), item('Dragons', '2026-09-01', '2026-09-30')] })
            );

            expect(errors).toEqual([]);
        });
    });

    test('requires a name, a subject, a year group and an academic year', async () => {
        const errors = await errorsFor(fixedForm([item('Dragons', '2026-08-03', '2026-08-08')]));
        const missing = await errorsFor({
            ...fixedForm([item('Dragons', '2026-08-03', '2026-08-08')]),
            name: '  ',
            subjectId: '',
            yearGroupId: '',
            periodIndex: ''
        });

        expect(errors).toEqual([]);
        expect(missing.filter((message) => message === 'This field is required.')).toHaveLength(4);
    });

    /**
     * Caught here rather than by the API, so the admin sees it beside the field. Whether the topic
     * dates actually fall inside that year is checked server-side, where the period's own start and
     * end dates live.
     */
    test('requires the academic year on its own, with every other field valid', async () => {
        const missing = await errorsFor({
            ...fixedForm([item('Dragons', '2026-08-03', '2026-08-08')]),
            periodIndex: ''
        });

        expect(missing).toEqual(['This field is required.']);
    });

    /**
     * The academic year is a FIXED-only field. An interval sequence carries no dates, so it belongs
     * to no year, the form does not render the field for it, and requiring one would block a save on
     * something the admin cannot see or fill in.
     */
    describe('the academic year is FIXED-only', () => {
        test('an interval sequence validates with no academic year at all', async () => {
            expect(await errorsFor(intervalForm({}))).toEqual([]);
        });

        test('switching a fixed form to interval clears the error the missing year was raising', async () => {
            const asFixed = { ...fixedForm([item('Dragons', '2026-08-03', '2026-08-08')]), periodIndex: '' };

            expect(await errorsFor(asFixed)).toEqual(['This field is required.']);

            // The same values, with only the mode changed, plus the cadence interval mode needs.
            expect(await errorsFor({ ...asFixed, timingMode: SequenceTimingMode.INTERVAL, intervalDays: '14' })).toEqual([]);
        });
    });
});
