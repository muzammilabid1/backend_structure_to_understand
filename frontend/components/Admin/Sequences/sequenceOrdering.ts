import { SequenceTimingMode } from 'lwp-shared';
import moment from 'moment';

import { IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';

/**
 * Ordering, date and overlap rules for the admin sequence form.
 *
 * Kept free of React and of the GraphQL layer so the rules can be unit tested
 * directly. The date arithmetic deliberately mirrors resolveSequenceItemDates in
 * the graphql-provider's topic_sequence.service.ts, using moment for the same
 * reason it does, so the form's live preview and the saved sequence agree.
 */

/**
 * How a sequence's timing reads to a person. Interval shows its length, which is the useful part.
 *
 * Lives here rather than beside the admin list that first needed it, because the class schedule page
 * needs it too and importing it from that list would pull the whole admin list component, its queries
 * and its table into a teacher-facing bundle. This module is pure, so it costs nothing.
 */
export const describeTiming = (sequence: Pick<IStaticLwpTopicSequence, 'timingMode' | 'intervalDays'>): string => {
    if (sequence.timingMode === SequenceTimingMode.FIXED) return 'Fixed dates';

    const days = sequence.intervalDays;

    // A cadence is required for an interval sequence, so a missing one means a sequence saved before
    // that rule existed. Naming the mode is the honest fallback; claiming a length would not be.
    if (!days) return 'Interval';

    return `Every ${days} ${days === 1 ? 'day' : 'days'}`;
};

/** A topic in the form's working list, before it is saved. */
export interface SequenceDraftItem {
    topicId: string;
    topicName: string;
    /** YYYY-MM-DD, or '' while the admin has not set it yet. Required before the form will save. */
    startDate: string;
    /**
     * YYYY-MM-DD, or '' for an open-ended window. Optional in FIXED mode, matching the optional due
     * date a teacher gets when scheduling a topic by hand. Always generated in INTERVAL mode.
     */
    endDate: string;
}

/** Formats a YYYY-MM-DD date for display. The form passes showDate({ date, short: true }). */
export type FormatDate = (date: string) => string;

/**
 * A problem with one topic's dates, anchored to the topic it belongs to so the
 * table can show it under that row rather than as a block below the table.
 */
export interface SequenceItemFinding {
    topicId: string;
    message: string;
}

/**
 * Normalises a date to a zero-padded YYYY-MM-DD string.
 *
 * The sequence screens use this rather than the shared _get_iso_8601_date_format
 * helper, which emits an unpadded '2026-9-1'. Padding matters here because these
 * dates are compared and sorted as strings, and unpadded ones do not compare
 * chronologically.
 *
 * A YYYY-MM-DD string is padded directly rather than being routed through Date,
 * which would parse it as UTC midnight and could shift the day.
 */
export const toDateOnly = (date: Date | string | null | undefined): string => {
    if (!date) return '';

    if (typeof date === 'string') {
        const parts = date.split('T')[0].split('-');

        if (parts.length !== 3) return '';

        const [year, month, day] = parts;

        return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    if (Number.isNaN(date.getTime())) return '';

    return [
        String(date.getFullYear()).padStart(4, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

/**
 * Turns a YYYY-MM-DD string into a Date in local time, for the date picker.
 *
 * Built from the parts rather than passed to the Date constructor, which would
 * read the string as UTC midnight and could render the previous day.
 */
export const parseDateOnly = (date: string | null | undefined): Date | null => {
    if (!date) return null;

    const parts = date.split('T')[0].split('-');

    if (parts.length !== 3) return null;

    const [year, month, day] = parts.map(Number);

    if ([year, month, day].some(Number.isNaN)) return null;

    return new Date(year, month - 1, day);
};

/**
 * A closed window, meaning both ends are known.
 *
 * A topic with no end date is deliberately excluded from the overlap and reversed-window checks:
 * there is no end to compare, so no overlap can be asserted. Treating an open end as running
 * forever would warn on every topic below it, which is noise rather than information.
 */
const hasWindow = (item: SequenceDraftItem) => Boolean(item.startDate && item.endDate);

/**
 * Sorts by start date, as the server does when it settles a fixed sequence.
 *
 * Items with no start date yet sink to the bottom rather than jumping to the top,
 * so a newly added topic stays where the admin can see it. The sort is stable, so
 * items sharing a start date keep the order the admin arranged them in.
 */
export const sortItemsByStartDate = (items: SequenceDraftItem[]): SequenceDraftItem[] =>
    [...items].sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;

        return a.startDate.localeCompare(b.startDate);
    });

/**
 * Fixed mode only. Finds topics whose dates disagree with the order the admin
 * dragged them into.
 *
 * These block submit. The dragged order is authoritative but dates are never
 * rewritten automatically, because these are real dates on a real schedule and
 * should only change when someone types them. So the form asks the admin to
 * change the dates instead.
 */
export const findOrderErrors = (items: SequenceDraftItem[], formatDate: FormatDate): SequenceItemFinding[] => {
    const errors: SequenceItemFinding[] = [];

    for (let index = 0; index < items.length - 1; index += 1) {
        const above = items[index];
        const below = items[index + 1];

        if (!above.startDate || !below.startDate) continue;

        if (above.startDate.localeCompare(below.startDate) > 0) {
            // Reported against the topic that is out of place, which is the one the
            // copy names first, so the message sits on the row the admin must fix.
            errors.push({
                topicId: above.topicId,
                message:
                    `${above.topicName} starts ${formatDate(above.startDate)} but sits above ${below.topicName}, ` +
                    `which starts ${formatDate(below.startDate)}. Change the dates to match this order.`
            });
        }
    }

    return errors;
};

/**
 * Fixed mode only. Finds topics whose date windows overlap.
 *
 * These warn but never block. A teacher scheduling by hand may already overlap
 * topics freely, a short handover overlap is legitimate, and blocking would make
 * it impossible to save a partially re-dated sequence when reusing one in a later
 * year. Two topics sharing a start date overlap by definition, so they warn too.
 */
export const findOverlapWarnings = (items: SequenceDraftItem[], formatDate: FormatDate): SequenceItemFinding[] => {
    const warnings: SequenceItemFinding[] = [];
    const window = (item: SequenceDraftItem) => `${formatDate(item.startDate)} to ${formatDate(item.endDate)}`;

    for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
            const earlier = items[i];
            const later = items[j];

            if (!hasWindow(earlier) || !hasWindow(later)) continue;

            const overlaps = earlier.startDate.localeCompare(later.endDate) <= 0 && later.startDate.localeCompare(earlier.endDate) <= 0;

            if (overlaps) {
                // Reported against the lower topic, so the warning sits on the row that
                // runs into the one above it rather than being repeated on both.
                warnings.push({
                    topicId: later.topicId,
                    message:
                        `${later.topicName} (${window(later)}) overlaps ${earlier.topicName} (${window(earlier)}), ` +
                        `so a class will have both topics running at once. That's fine if you meant it, or you can adjust the dates.`
                });
            }
        }
    }

    return warnings;
};

/** Fixed mode only. A topic whose window ends before it starts, which the server rejects. */
export const findReversedWindowErrors = (items: SequenceDraftItem[], formatDate: FormatDate): SequenceItemFinding[] =>
    items
        .filter((item) => hasWindow(item) && item.endDate.localeCompare(item.startDate) < 0)
        .map((item) => ({
            topicId: item.topicId,
            message:
                `${item.topicName} ends ${formatDate(item.endDate)} but starts ${formatDate(item.startDate)}. ` +
                `A topic cannot end before it starts.`
        }));

export interface SequenceDateFindings {
    /** Block submit. */
    errors: SequenceItemFinding[];
    /** Shown as a warning, submit still allowed. */
    warnings: SequenceItemFinding[];
}

/** Groups findings by topic, so a row can render the ones that belong to it. */
export const groupFindingsByTopic = (findings: SequenceItemFinding[]): Record<string, string[]> =>
    findings.reduce<Record<string, string[]>>((grouped, finding) => {
        grouped[finding.topicId] = [...(grouped[finding.topicId] || []), finding.message];

        return grouped;
    }, {});

/**
 * All the date findings for the current draft, split by whether they block submit.
 *
 * Interval sequences generate their own back-to-back windows, so they can neither
 * be out of order nor overlap. Only fixed sequences are checked.
 */
export const findSequenceDateFindings = (items: SequenceDraftItem[], isFixed: boolean, formatDate: FormatDate): SequenceDateFindings => {
    if (!isFixed) return { errors: [], warnings: [] };

    return {
        errors: [...findReversedWindowErrors(items, formatDate), ...findOrderErrors(items, formatDate)],
        warnings: findOverlapWarnings(items, formatDate)
    };
};
