import { SequenceItemSkipReason, SequenceTimingMode } from 'lwp-shared';
import moment from 'moment';

import { ISequenceAssignmentPlanItem, ISequenceDateOverride, SequenceDateOverrides } from '../../../types/entities/ISequenceAssignmentPlan';
import { IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';
// The date helpers and the finding shape are shared with the admin sequence form rather than
// duplicated. They are a pure module with no React or GraphQL in it, so importing across from
// Admin/ is deliberate: moving it would mean rewriting LEA-6425's imports and test paths for no
// behavioural gain. Note toDateOnly zero-pads, which the shared _get_iso_8601_date_format does not.
import { FormatDate, SequenceItemFinding, toDateOnly } from '../../Admin/Sequences/sequenceOrdering';

/**
 * The leader's side of assigning a sequence: what the preview table shows, which of their date
 * adjustments are safe to send, and how the result reads.
 *
 * Kept free of React and of the GraphQL layer so the rules can be unit tested directly. The
 * validation here mirrors what planClassTopicDates and findPastDatedTopicIds enforce in
 * class_sequence_assignment.service.ts, so the leader is told what is wrong before the server
 * has to refuse it.
 */

/** How a skip reason reads to a leader. The enum values themselves are not user-facing. */
export const skipReasonLabel = (reason: SequenceItemSkipReason | null): string => {
    if (reason === SequenceItemSkipReason.ALREADY_SCHEDULED) return 'Already scheduled';
    if (reason === SequenceItemSkipReason.CONTENT_UNAVAILABLE) return 'Content unavailable';

    return 'Skipped';
};

/** Why a topic is being left out, spelled out under its row. */
export const skipReasonExplanation = (reason: SequenceItemSkipReason | null): string => {
    if (reason === SequenceItemSkipReason.ALREADY_SCHEDULED) return 'This class already has this topic on its schedule.';
    if (reason === SequenceItemSkipReason.CONTENT_UNAVAILABLE) return 'This topic is not currently available, so it will not be scheduled.';

    return 'This topic will not be scheduled.';
};

/**
 * The counts the leader sees above the table.
 *
 * Every number is reconciled against the rows on screen, which is why skipped and dropped topics are
 * shown rather than quietly disappearing: "5 topics will be added" beside seven rows would not add
 * up.
 *
 * Skipped and removed are said separately rather than totalled (LEA-6596). A skip is something that
 * happened to the plan and a removal is something the teacher did to it, so one is news and the other
 * is a confirmation, and a single number would leave them unable to tell whether the count was theirs.
 */
export const describePlanSummary = (scheduledCount: number, skippedCount: number, excludedCount = 0): string => {
    const topics = `${scheduledCount} ${scheduledCount === 1 ? 'topic' : 'topics'}`;
    const removed = excludedCount ? `${excludedCount} removed` : '';
    const skipped = skippedCount ? `${skippedCount} skipped` : '';
    const trailing = [skipped, removed].filter(Boolean).join(', ');

    if (!scheduledCount) {
        if (!trailing) return 'Nothing to add.';

        /*
         * Each cause gets its own sentence when it is the only one, so a teacher who has just emptied
         * the list is told that is why rather than reading it as the sequence having nothing to give
         * them. Where both apply there is no single cause to name, so the counts are listed.
         */
        if (!excludedCount) return `Nothing will be added. All ${skippedCount} topics are being skipped.`;

        if (!skippedCount) return `Nothing will be added. All ${excludedCount} topics have been removed.`;

        return `Nothing will be added: ${trailing}.`;
    }

    return trailing ? `${topics} will be added, ${trailing}.` : `${topics} will be added.`;
};

/**
 * The start date to offer for a class: **tomorrow**.
 *
 * It used to come from the sequence, whose admin-set anchor was prefilled while it was still in the
 * future. An interval sequence carries no anchor any more (LEA-6594), so there is nothing to read
 * and the choice belongs entirely to the teacher.
 *
 * ⚠️ **The default and the minimum deliberately differ by one day, and this is not an inconsistency
 * to tidy away.** The minimum is today; the default is tomorrow.
 *
 * The release cron runs every ten minutes (`0 * /10 * * * *` in `email.task.ts`) and
 * `releasePupilTopics` matches `releaseDate <= now`, so **a topic dated today goes live within ten
 * minutes**, before the teacher has closed the tab. Defaulting to tomorrow protects against that.
 * Keeping the floor at today still lets a teacher who deliberately wants it live now choose it.
 */
export const defaultStartDateForSequence = (today: string): string => moment(today, 'YYYY-MM-DD').add(1, 'day').format('YYYY-MM-DD');

/**
 * A fixed sequence carries its own dates, so neither a start date nor an interval drives anything for
 * one. Both controls exist only for an interval schedule, which generates its dates from them.
 */
export const needsStartDate = (timingMode: SequenceTimingMode | undefined): boolean => timingMode === SequenceTimingMode.INTERVAL;

/*
 * `validateIntervalDays` and `parseIntervalDays` used to live here, checking a cadence a leader had
 * typed for their own class before it was sent. LEA-6624 removed that field: the cadence is a
 * Learning with Parents decision held on the sequence, so this page has nothing to validate.
 *
 * The equivalent rule moved rather than vanished. `topicSequenceValidation` carries it on the admin
 * form, which is where a cadence is now entered, and `assertIntervalMatchesTimingMode` is the
 * server's last word on it.
 */

/**
 * What a row should display: the leader's adjustment where they have made one, otherwise the
 * plan the server computed.
 *
 * Overrides are shown even while invalid, so the leader can see the date they typed alongside the
 * error about it rather than having their input silently reverted.
 */
export const resolveRowDates = (
    item: ISequenceAssignmentPlanItem,
    overrides: SequenceDateOverrides
): { releaseDate: string; dueDate: string } => {
    const override = overrides[item.topic.id];

    if (override) return { releaseDate: override.releaseDate, dueDate: override.dueDate };

    return { releaseDate: toDateOnly(item.releaseDate), dueDate: toDateOnly(item.dueDate) };
};

/** True when the leader has changed this topic's dates away from the plan's. */
export const isOverridden = (item: ISequenceAssignmentPlanItem, overrides: SequenceDateOverrides): boolean => {
    const override = overrides[item.topic.id];

    if (!override) return false;

    return override.releaseDate !== toDateOnly(item.releaseDate) || override.dueDate !== toDateOnly(item.dueDate);
};

/*
 * `shiftPlanDates` used to live here, moving a whole fixed sequence so its first topic started on a
 * date the leader chose. LEA-6625 removed it, and `planStartDate`, `addDays` and `DATE_FORMAT` went
 * with it: the first existed only to find the shift's anchor and the others only to apply its offset.
 *
 * It was removed for the reason it worked. Preserving every gap and window length while moving the
 * whole set is exactly what drags a holiday-dodging set onto a holiday, and the Curriculum team
 * picks those dates precisely to avoid them.
 *
 * Re-dating is per row now, through `changeDate` and the pencil on each row, or a row can be dropped
 * (LEA-6596). Both survive as ways to rescue a sequence whose dates have passed.
 */

const overrideError = (dates: ISequenceDateOverride, topicName: string, today: string, formatDate: FormatDate): string | null => {
    if (!dates.releaseDate) return `${topicName} needs a start date.`;

    // Mirrors findPastDatedTopicIds. Blocked rather than warned, so nothing can ever be created
    // already released (plan decision 10).
    if (dates.releaseDate.localeCompare(today) < 0) {
        // Names only what is still on the page. It used to offer "or move all the dates forward",
        // which was a real control until LEA-6625 removed it; dropping the topic is the other way out
        // now, and is the one that suits a sequence most of which is behind.
        return `${topicName} would start ${formatDate(dates.releaseDate)}, which is in the past. Change its dates, or remove it from this sequence.`;
    }

    // An open end is allowed, exactly as it is for a hand-scheduled topic, so there is only
    // something to check when there is one.
    if (dates.dueDate && dates.dueDate.localeCompare(dates.releaseDate) < 0) {
        return `${topicName} would end ${formatDate(dates.dueDate)} but start ${formatDate(dates.releaseDate)}. A topic cannot end before it starts.`;
    }

    return null;
};

/**
 * Date problems with the rows as they will actually be created, anchored to the topic each belongs
 * to so the table can show them under that row.
 *
 * Every schedulable row is checked, not only the adjusted ones. When the plan came from the server
 * its own dates are already known good, so those rows always pass; but when the preview was refused
 * and the template's dates are standing in, this is what tells the leader which ones to move.
 */
export const findRowDateErrors = (
    items: ISequenceAssignmentPlanItem[],
    overrides: SequenceDateOverrides,
    today: string,
    formatDate: FormatDate
): SequenceItemFinding[] =>
    items.reduce<SequenceItemFinding[]>((findings, item) => {
        // A skipped topic is not being created, so its dates cannot be wrong.
        if (item.skipped) return findings;

        const dates = resolveRowDates(item, overrides);

        /*
         * A row the plan did not date and the leader has not touched. There is no date here to be
         * wrong about: either the server is not scheduling it, or the plan on screen predates the
         * teacher putting it back and has not caught up yet.
         *
         * Without this, undoing a removal reported "X needs a start date" underneath a row that
         * plainly has dates, and blocked the action, for as long as the next preview took to arrive.
         * A row whose date the leader cleared themselves still carries an override, so that stays the
         * blocking error it should be.
         */
        if (!dates.releaseDate && !overrides[item.topic.id]) return findings;

        const message = overrideError(dates, item.topic.teacherTopicName, today, formatDate);

        return message ? [...findings, { topicId: item.topic.id, message }] : findings;
    }, []);

/**
 * The overrides that are safe to send.
 *
 * Invalid ones are held back deliberately: they are already reported on their row, and sending
 * one would make previewSequenceForClass throw, replacing the whole table with an error while the
 * leader is still mid-edit.
 *
 * Ones that match the plan are held back too. They would change nothing, and leaving them out keeps
 * what is sent an honest record of what the leader actually altered.
 *
 * That comparison is only sound because the plan is always the *un-overridden* one: overrides are
 * never sent to previewSequenceForClass. Sending them made the returned plan reflect them, so an
 * applied override looked identical to the plan, was dropped as a no-op, and the preview re-ran
 * without it, which flip-flopped forever. Skips depend on topic ids and publication state and never
 * on dates, so the preview has nothing to tell us about an adjustment anyway.
 */
export const toValidOverrideInputs = (
    items: ISequenceAssignmentPlanItem[],
    overrides: SequenceDateOverrides,
    today: string
): { topicId: string; releaseDate: string; dueDate: string | null }[] =>
    items.reduce<{ topicId: string; releaseDate: string; dueDate: string | null }[]>((inputs, item) => {
        const override = overrides[item.topic.id];

        if (!override || item.skipped) return inputs;
        if (!isOverridden(item, overrides)) return inputs;
        if (overrideError(override, item.topic.teacherTopicName, today, (date) => date)) return inputs;

        return [
            ...inputs,
            {
                topicId: item.topic.id,
                releaseDate: override.releaseDate,
                // An open window is sent as null, not as the empty string the row holds: the
                // DateOnly scalar rejects ''.
                dueDate: override.dueDate || null
            }
        ];
    }, []);

/**
 * Plan items built from the sequence template rather than from the server.
 *
 * Used only when previewSequenceForClass has refused the plan, which happens when a fixed
 * sequence's own dates have fallen into the past: a template built for one autumn and assigned
 * the next. The mutation names the offending topics so they can be fixed in one pass, but with no
 * plan there would be no rows to fix them on. These rows give the leader something to edit, and
 * the real plan replaces them as soon as the preview succeeds.
 *
 * Skips are unknowable without the server, so every row reads as schedulable until then.
 */
export const templatePlanItems = (sequence: IStaticLwpTopicSequence | undefined): ISequenceAssignmentPlanItem[] =>
    [...(sequence?.items || [])]
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
            topic: item.topic,
            order: item.order,
            releaseDate: toDateOnly(item.startDate),
            dueDate: toDateOnly(item.endDate) || null,
            skipped: false,
            skipReason: null,
            // Like skips, this is the server's answer and cannot be known without it.
            alreadyScheduled: false
        }));
