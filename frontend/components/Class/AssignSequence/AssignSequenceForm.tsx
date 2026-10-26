import { useMutation, useQuery } from '@apollo/client';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, CircularProgress, Grid } from '@mui/material';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { getClassTopics } from '../../../graphQl/queries';
import { showDate, ThemeContext } from '../../../shared/Services/handler';
import { ISequenceAssignmentPlan, SequenceDateOverrides } from '../../../types/entities/ISequenceAssignmentPlan';
import { IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';
import { describeTiming, groupFindingsByTopic, parseDateOnly, toDateOnly } from '../../Admin/Sequences/sequenceOrdering';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonError from '../../Shared/CommonError';
import CommonSelectField from '../../Shared/CommonSelectField';
import DateField from '../../Shared/InputField/DateField';
import Paragraph from '../../Shared/Typography/Paragraph';
import {
    defaultStartDateForSequence,
    describePlanSummary,
    findRowDateErrors,
    needsStartDate,
    templatePlanItems,
    toValidOverrideInputs
} from './assignSequencePlan';
import { assignSequenceToClass, previewSequenceForClass } from './queries';
import SequenceAssignmentPreviewTable from './SequenceAssignmentPreviewTable';

interface AssignSequenceFormProps {
    classId: string;
    /**
     * What this class may be given, already loaded by the page: the form is only rendered once there
     * is something to schedule, so it never has to show a loading or empty state of its own.
     */
    sequences: IStaticLwpTopicSequence[];
    /** "Skip for now" when the leader was sent here by activating a class, "Cancel" otherwise. */
    cancelText: string;
    /**
     * Optional guidance rendered immediately above the action row. The page owns both what it says and
     * whether to say it, because that depends on how the leader arrived; this only decides where it
     * sits, which is next to the button it is about.
     */
    cancelNote?: React.ReactNode;
    onCancel: () => void;
    onAssigned: () => void;
}

/**
 * How long a typed date has to settle before the preview asks for it. Long enough to swallow the
 * intermediate dates typing a year produces, short enough that picking one from the calendar feels
 * immediate.
 */
const PREVIEW_SETTLE_MS = 400;

const formatShortDate = (date: string) => showDate({ date, short: true });

/**
 * Auto-scheduling a sequence onto one class, on the class's own auto-schedule page.
 *
 * The table renders the plan the server computed, with the leader's own date changes applied on top.
 * Those are validated here and sent only when auto-scheduling, never to the preview: see the comment
 * on the preview query.
 */
const AssignSequenceForm = ({ classId, sequences, cancelText, cancelNote, onCancel, onAssigned }: AssignSequenceFormProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    // The page is short-lived, so "today" is fixed at mount rather than tracked.
    const today = useMemo(() => toDateOnly(new Date()), []);

    // With one to choose from there is nothing to choose, so it starts chosen. The list is loaded
    // before this renders, so this needs no effect to catch up with it.
    const [sequenceId, setSequenceId] = useState(sequences.length === 1 ? sequences[0].id : '');
    const [overrides, setOverrides] = useState<SequenceDateOverrides>({});
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

    const selectedSequence = sequences.find((sequence) => sequence.id === sequenceId);

    /**
     * The anchor an interval schedule counts from, defaulted to tomorrow.
     *
     * It used to be seeded from the sequence's own suggestion. An interval sequence carries no anchor
     * any more (LEA-6594), so the choice is entirely the teacher's and the default is the same
     * whichever sequence they pick.
     */
    const [startDate, setStartDate] = useState(() => defaultStartDateForSequence(today));

    /*
     * There is no cadence state here any more (LEA-6624).
     *
     * A leader used to be able to run a sequence at their own pace. Ready Teddy is designed to run
     * weekly, schools have been told so, and a class running it fortnightly changes the outcome of
     * the programme there, so the pace is ours and lives on the sequence. The server reads it; this
     * page neither sends it nor needs to know it.
     *
     * The sequence's cadence is still fetched, because `describeTiming` names it in the dropdown so
     * a leader can see what they are choosing.
     */

    /**
     * Topics this class is not to receive, by topic id (LEA-6596).
     *
     * The second way out of a fixed sequence whose dates have passed, beside moving them forward.
     * Held here rather than derived from the plan, because the plan is the server's answer and this
     * is the question: an excluded row comes back on the plan marked `excluded`, and reading the
     * state off that answer would make the toggle depend on a round trip.
     */
    const [excludedTopicIds, setExcludedTopicIds] = useState<string[]>([]);

    /**
     * What the preview actually asks for, held apart from the fields above.
     *
     * Both text fields fire onChange per keystroke. Typing a year passes through dates that parse but
     * are nonsense, 0002 then 0020 then 0202 before 2026, and typing 14 passes through 1. Each of
     * those is a valid variable change that would fire a preview the server then answers pointlessly
     * or refuses. Settling first means one request per value the leader actually meant.
     *
     * Exclusions are sent, unlike the date overrides, which are never sent at all. An override only
     * moves a date the page can validate for itself, where an exclusion changes what the server
     * plans: it is what clears the past-dated refusal, and on an interval sequence it re-dates every
     * topic below the one dropped. They cannot cause the refetch loop overrides did, because nothing
     * echoes them back as dates.
     *
     * But they do not wait on this timer. `toggleExcluded` applies them here at once, since a button
     * press has no intermediate values to settle, and letting them lag left the confirm button live
     * with a stale list behind it.
     */
    const [requested, setRequested] = useState({ startDate, excludedTopicIds });

    useEffect(() => {
        if (requested.startDate === startDate && requested.excludedTopicIds === excludedTopicIds) return;

        const timer = setTimeout(() => setRequested({ startDate, excludedTopicIds }), PREVIEW_SETTLE_MS);

        return () => clearTimeout(timer);
    }, [startDate, excludedTopicIds, requested]);

    const requiresStartDate = needsStartDate(selectedSequence?.timingMode);

    /*
     * An interval schedule needs an anchor and a cadence. The anchor is asked for here and defaults
     * to tomorrow, so it is only ever missing if a leader clears it; the cadence comes from the
     * sequence, so it is never this page's to be missing.
     *
     * This used to also wait on a valid cadence typed into a box, which is why choosing a sequence
     * once showed no plan at all until a number was supplied (LEA-6624 removed the box).
     */
    const canPreview = Boolean(sequenceId) && (!requiresStartDate || Boolean(requested.startDate));

    /**
     * The plan the class would get before any of the leader's own adjustments, so it is a stable
     * baseline: the variables deliberately carry no overrides.
     *
     * Sending them caused an infinite refetch. The returned plan reflected an applied override, so
     * the override then looked identical to the plan, was dropped as a no-op, and the preview re-ran
     * without it, which flip-flopped forever. Nothing is lost by leaving them out, because skips are
     * resolved from topic ids and publication state and never from dates, and the server applies an
     * override verbatim rather than computing anything from it. Adjustments are applied to the rows
     * here and sent only when assigning.
     */
    const {
        data: previewData,
        previousData: previousPreviewData,
        loading: previewLoading,
        error: previewError
    } = useQuery(previewSequenceForClass, {
        variables: {
            input: {
                classId,
                sequenceId,
                // Both ignored by the API for a fixed sequence, which carries its own dates.
                startDate: requiresStartDate ? requested.startDate : null,
                // Sent, unlike the overrides above, because this is what clears a past-dated refusal
                // and the server has to re-plan without the row to do it.
                excludedTopicIds: requested.excludedTopicIds
            }
        },
        skip: !canPreview,
        fetchPolicy: 'network-only',
        // So `loading` flips reliably on a variable change as well as a first load, since the
        // in-flight states below depend on it.
        notifyOnNetworkStatusChange: true
    });

    /**
     * Apollo clears `data` while new variables are in flight, so falling back to `previousData`
     * keeps the table on screen during a re-preview. It can be for the sequence the leader has just
     * switched away from, so it is only usable while it still describes the chosen one.
     */
    const rawPlan = previewData?.previewSequenceForClass ?? previousPreviewData?.previewSequenceForClass ?? null;

    /**
     * Dropped once the preview has failed, even though `previousData` still holds one for this
     * sequence. That older plan was computed from a different start date or interval, so keeping it
     * would show dates the error says are wrong beside a button that would submit the new values.
     */
    const plan: ISequenceAssignmentPlan | null = !previewError && rawPlan?.sequence?.id === sequenceId ? rawPlan : null;

    const fallbackItems = useMemo(() => templatePlanItems(selectedSequence), [selectedSequence?.id]);

    /**
     * With no plan there would be nothing to edit, and the commonest reason for having no plan is a
     * fixed sequence whose dates have fallen into the past, which is exactly the case the leader is
     * meant to fix by nudging them. So the template's own rows stand in until a preview succeeds.
     *
     * Fixed sequences only. An interval schedule's template dates come from the admin's own anchor,
     * so showing them after the leader's anchor was refused would present dates nobody asked for.
     * There the error names what to change, and the two fields above are where to change it.
     */
    const usingFallback = Boolean(previewError && !plan && !requiresStartDate && fallbackItems.length);
    const displayItems = plan?.items ?? (usingFallback ? fallbackItems : []);

    /**
     * Dropped rows are left out, so a past date on one cannot block the action (LEA-6596).
     *
     * The check applies to what will actually be created, exactly as the server's does. Filtering
     * here rather than inside findRowDateErrors keeps that helper about dates alone, and keeps the
     * two rules readable side by side: a row that stays has to be moved, a row that goes does not.
     *
     * The fallback rows matter most here, since they are the ones on screen while a past-dated fixed
     * sequence is still being refused, and they carry no `excluded` flag of their own.
     */
    const includedItems = useMemo(
        () => displayItems.filter((item) => !excludedTopicIds.includes(item.topic.id)),
        [displayItems, excludedTopicIds]
    );

    const rowErrors = useMemo(() => findRowDateErrors(includedItems, overrides, today, formatShortDate), [includedItems, overrides, today]);

    /*
     * Dropped rows are left out here too. A row the teacher edited and then dropped keeps its
     * override in state, ready for them to change their mind, but sending it would claim dates for a
     * topic that is not being created.
     */
    const validOverrideInputs = useMemo(() => toValidOverrideInputs(includedItems, overrides, today), [includedItems, overrides, today]);

    const [assignMutation, { loading: assignLoading }] = useMutation(assignSequenceToClass, {
        refetchQueries: [{ query: getClassTopics, variables: { classId } }],
        awaitRefetchQueries: true
    });

    const changeSequence = (nextSequenceId: string) => {
        setSequenceId(nextSequenceId);
        // Reset explicitly rather than through an effect on the selection, so there is one place that
        // says what changing the choice does. Adjustments name topics, and a different set has
        // different topics, so none of them carry over.
        // The start date does not vary by sequence, since none of them carry an anchor, but it is
        // still reset rather than left alone: the leader may have moved it for the previous choice.
        //
        // The cadence is not reset because it is not held here: a different sequence may run at a
        // different pace, and the server reads that pace off whichever sequence is chosen.
        const nextStartDate = defaultStartDateForSequence(today);

        // Applied to the requested values at once as well: choosing from the dropdown is one
        // deliberate act, so there is nothing to wait for, unlike a value typed a character at a time.
        setStartDate(nextStartDate);
        setExcludedTopicIds([]);
        setRequested({ startDate: nextStartDate, excludedTopicIds: [] });
        setOverrides({});
        setEditingTopicId(null);
    };

    const changeDate = (topicId: string, field: 'releaseDate' | 'dueDate', value: string) => {
        setOverrides((current) => {
            const item = displayItems.find((displayItem) => displayItem.topic.id === topicId);

            const existing = current[topicId] ?? {
                releaseDate: toDateOnly(item?.releaseDate),
                dueDate: toDateOnly(item?.dueDate)
            };

            return { ...current, [topicId]: { ...existing, [field]: value } };
        });
    };

    const summary = plan ? describePlanSummary(plan.scheduledCount, plan.skippedCount, plan.excludedCount) : '';

    /*
     * The fallback rows have no plan behind them, so `nothingToAdd` cannot see a teacher who has
     * dropped every row of a past-dated fixed sequence. Counted here as well, or the action would
     * stay enabled with nothing left to create.
     */
    const nothingToAdd = Boolean(plan ? !plan.scheduledCount : usingFallback && !includedItems.length);

    /**
     * `canPreview` is part of this because Apollo keeps the last result while a query is skipped, so
     * clearing an interval sequence's start date would otherwise leave a stale plan on screen looking
     * ready to go.
     *
     * The fallback rows count as well as a server plan. They only appear when the preview was refused
     * for past dates, and refusing to submit them would leave the leader with the dates on screen,
     * the errors telling them what to fix, and no way to act on either. Every row's dates are checked
     * here, and the server checks them again on submit, so nothing past can slip through.
     */
    const canAssign = canPreview && Boolean(displayItems.length) && !nothingToAdd && !rowErrors.length && !previewLoading && !assignLoading;

    /**
     * Drops a topic from this class's copy of the sequence, or puts it back (LEA-6596).
     *
     * A dropped row is not removed from the table: it stays, struck through, with this same control
     * offering it back. A teacher who drops the wrong one can undo it where they are, and the shape
     * of the admin's sequence stays visible, so they can see what they are declining rather than only
     * what they are keeping.
     */
    const toggleExcluded = (topicId: string) => {
        const next = excludedTopicIds.includes(topicId) ? excludedTopicIds.filter((id) => id !== topicId) : [...excludedTopicIds, topicId];

        setExcludedTopicIds(next);

        /*
         * Applied to the requested values at once, exactly as changing the sequence is: pressing a
         * button is one deliberate act, with none of the half-typed intermediate values a text field
         * passes through, so there is nothing to wait for.
         *
         * Correctness, not only smoothness. While this settled through the timer, the confirm button
         * stayed enabled for those 400ms and `assign` sent the *previous* exclusions, so a teacher who
         * dropped a topic and confirmed straight away was given the topic they had just struck
         * through. Firing now means the preview is in flight by the time the button is pressed, and
         * `canAssign` holds it until the plan comes back.
         */
        setRequested((settled) => ({ ...settled, excludedTopicIds: next }));
    };

    const assign = () => {
        assignMutation({
            variables: {
                input: {
                    classId,
                    sequenceId,
                    // The dates come from the settled values, which are the ones the plan on screen
                    // was built from, so what is created is what was confirmed.
                    startDate: requiresStartDate ? requested.startDate : null,
                    overrides: validOverrideInputs,
                    /*
                     * The live list rather than the settled one, which `toggleExcluded` now keeps in
                     * step anyway. This is the list the strike-through on screen is drawn from, so
                     * reading it here is what guarantees the one thing that must never happen: a topic
                     * the teacher can see struck through being created regardless.
                     */
                    excludedTopicIds
                }
            }
        })
            .then(({ data }) => {
                const assigned: ISequenceAssignmentPlan = data?.assignSequenceToClass;
                const added = `${assigned.scheduledCount} ${assigned.scheduledCount === 1 ? 'topic' : 'topics'} added to this class`;

                callSnackbar(assigned.skippedCount ? `${added}, ${assigned.skippedCount} skipped` : added, 'success');
                onAssigned();
            })
            .catch((error) => callSnackbar(error, 'error'));
    };

    return (
        <>
            <Grid container spacing={3} className="assign-sequence-fields">
                <CommonSelectField
                    md={requiresStartDate ? 6 : 12}
                    lg={requiresStartDate ? 6 : 12}
                    name="sequenceId"
                    label="Choose a sequence to auto-schedule for this class"
                    shrink
                    displayEmpty
                    dataTest="assign-sequence-select"
                    value={sequenceId}
                    options={[
                        { key: '', value: 'Choose what to schedule' },
                        ...sequences.map((sequence) => ({
                            key: sequence.id,
                            value: `${sequence.name} (${sequence.subject?.name}, ${describeTiming(sequence)})`
                        }))
                    ]}
                    onChange={(event: React.ChangeEvent<{ value: string }>) => changeSequence(event.target.value)}
                />

                {/*
                    Only an interval schedule is anchored on a date the school picks. A fixed one
                    carries its own dates, so a control here would imply it drives something it does
                    not.

                    A "Days between topics" box used to sit beside this, and took the other half of
                    the row. LEA-6624 removed it: the cadence is ours to set, so the anchor now has
                    the half-row to itself.
                */}
                {requiresStartDate ? (
                    <DateField
                        md={6}
                        lg={6}
                        // Not "startDate": sbt-class-schedule.spec.ts already selects
                        // input[name="startDate"] on the schedule page for the add-topic modal,
                        // and keeping the names distinct keeps that selector unambiguous.
                        name="assignSequenceStartDate"
                        label="Start date for this class"
                        disablePast
                        className="sequence-preview-date-field"
                        dataTest="assign-sequence-start-date"
                        value={parseDateOnly(startDate)}
                        onChange={(event) => setStartDate(toDateOnly(event.target.value as Date))}
                        error={startDate ? undefined : 'Choose a start date for this class'}
                        touched
                    />
                ) : null}
            </Grid>

            {/*
                ⚠️ **This space is deliberately empty, and three tickets in a row emptied it.** Kept as
                one note rather than three, because what matters is the state it left rather than the
                order things left in.

                For a **fixed** sequence there is now nothing between the sequence picker above and
                the preview table below. What went, and why:

                - The line "there is no start date to choose" (LEA-6626). It answered a question
                  nobody asks, and answered it with a negative claim the page then contradicted: a
                  bulk date panel sat right here with a field labelled "First topic starts".
                - The interval hint (LEA-6624), which named the cadence an admin had chosen so a
                  leader could see when they were departing from it. Departing is what that ticket
                  removed, along with the field.
                - The "Move all the dates" panel (LEA-6625), which re-dated a whole set from one
                  anchor. The Curriculum team picks these dates to fall clear of holidays and inset
                  days, and moving every topic by the same offset is precisely the operation that
                  undoes that: it faithfully preserves the gaps while dragging the set onto whatever
                  the offset lands on, so a carefully placed autumn set gains a topic in half term.
                  The care in the original dates is what makes a bulk shift harmful rather than
                  convenient.

                So re-dating is per row, on the pencil on each row, which is what the Curriculum team
                asked for. Dropping a row (LEA-6596) is the other way out, and the better one for a
                set so stale that most of it is behind.

                ⚠️ **One thing genuinely has no home any more.** "These dates were set for you" used to
                be carried by the bulk panel's hint. It now appears only on
                `assign-sequence-fallback-hint`, which shows when the preview has failed, so a fixed
                sequence with a perfectly good plan says nothing about where its dates came from. The
                pencils make them look editable without saying they were chosen deliberately. That may
                be fine, and LEA-6626 judged the explaining unnecessary, but nobody has looked at this
                area as a whole since it was emptied. Worth a designer's eye before anything is added
                back here.
            */}

            {!sequenceId ? null : previewLoading && !displayItems.length ? (
                <div className="assign-sequence-loading" data-test="assign-sequence-preview-loading">
                    <CircularProgress />
                    <Paragraph text="Working out the dates for this class" />
                </div>
            ) : (
                <>
                    {/* Surfaced verbatim: a past-dated plan names every offending topic so they can
                        all be fixed in one pass. */}
                    {previewError ? (
                        <div data-test="assign-sequence-preview-error">
                            <CommonError error={previewError.message} touched />
                            {usingFallback ? (
                                <Paragraph
                                    customClass="assign-sequence-hint"
                                    dataTest="assign-sequence-fallback-hint"
                                    text="These are the dates set by Learning with Parents. Change the ones that need it and everything will be checked again."
                                />
                            ) : null}
                        </div>
                    ) : null}

                    {summary ? <Paragraph customClass="assign-sequence-summary" dataTest="assign-sequence-summary" text={summary} /> : null}

                    <SequenceAssignmentPreviewTable
                        items={displayItems}
                        overrides={overrides}
                        errorsByTopic={groupFindingsByTopic(rowErrors)}
                        editingTopicId={editingTopicId}
                        onStartEditing={setEditingTopicId}
                        onStopEditing={() => setEditingTopicId(null)}
                        onChangeDate={changeDate}
                        // Interval dates are generated from the one start date above and must stay
                        // evenly spaced, so there is nothing to edit per topic: the interval itself
                        // is an admin decision. Fixed dates are real dates an admin typed, so those
                        // the leader may change for their class.
                        allowDateEditing={!requiresStartDate}
                        excludedTopicIds={excludedTopicIds}
                        onToggleExcluded={toggleExcluded}
                        isRefreshing={previewLoading && Boolean(displayItems.length)}
                    />

                    {nothingToAdd ? (
                        <Paragraph dataTest="assign-sequence-nothing-to-add" text="There is nothing to schedule for this class." />
                    ) : (
                        <Alert
                            className="assign-sequence-callout"
                            data-test="assign-sequence-callout"
                            icon={<HelpOutlineIcon sx={{ color: '#F28D00' }} />}
                            sx={{ backgroundColor: '#FFF6D9' }}
                            severity="warning">
                            <b>What happens next:</b>
                            <ul>
                                <li>These topics are added to this class&apos;s schedule on the dates above.</li>
                                <li>Each one is released to pupils automatically on its start date.</li>
                                <li>You can change or remove any of them until it has been released.</li>
                            </ul>
                        </Alert>
                    )}
                </>
            )}

            {/* Sits above the footer rather than with the intro at the top of the page, because it is
                about the button below it and is read at the moment that button is being considered. */}
            {cancelNote}

            {/* The page's own footer, where the dialog previously supplied one. Cancel leaves without
                writing anything, which is also what "Skip for now" means after activating a class. */}
            <div className="assign-sequence-actions" data-test="assign-sequence-actions">
                <LWPButton
                    btnText={cancelText}
                    customClass="cancel_btn"
                    color="inherit"
                    variant="text"
                    dataTest="assign-sequence-cancel-button"
                    onClick={onCancel}
                />
                <LWPButton
                    btnText="Auto-schedule"
                    dataTest="assign-sequence-submit-button"
                    disabled={!canAssign}
                    loading={assignLoading}
                    onClick={assign}
                />
            </div>
        </>
    );
};

export default AssignSequenceForm;
