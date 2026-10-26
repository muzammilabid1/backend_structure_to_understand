import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, CircularProgress, Grid } from '@mui/material';
import React from 'react';

import { showDate } from '../../../shared/Services/handler';
import { ISequenceAssignmentPlanItem, SequenceDateOverrides } from '../../../types/entities/ISequenceAssignmentPlan';
import { parseDateOnly, toDateOnly } from '../../Admin/Sequences/sequenceOrdering';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonError from '../../Shared/CommonError';
import CommonTag from '../../Shared/CommonTag';
import DateField from '../../Shared/InputField/DateField';
import Paragraph from '../../Shared/Typography/Paragraph';
import { isOverridden, resolveRowDates, skipReasonExplanation, skipReasonLabel } from './assignSequencePlan';

interface SequenceAssignmentPreviewTableProps {
    items: ISequenceAssignmentPlanItem[];
    overrides: SequenceDateOverrides;
    /** Blocking problems with the leader's adjustments, keyed by topic id, shown under their row. */
    errorsByTopic: Record<string, string[]>;
    /** The one row whose dates are open for editing, or null. */
    editingTopicId: string | null;
    onStartEditing: (topicId: string) => void;
    onStopEditing: () => void;
    onChangeDate: (topicId: string, field: 'releaseDate' | 'dueDate', value: string) => void;
    /**
     * Whether a row's dates may be changed for this class.
     *
     * False for an interval schedule, whose dates are generated from a single start date and must
     * stay evenly spaced: editing one topic would break the spacing, and the interval itself is an
     * admin decision. Those are re-dated by moving the start date instead.
     */
    allowDateEditing: boolean;
    /**
     * Topics the teacher has dropped from this class's copy (LEA-6596).
     *
     * Passed in rather than read off `item.excluded`, because the template fallback rows are built in
     * the browser and have no plan behind them. Those rows are exactly the ones on screen while a
     * past-dated fixed sequence is being refused, which is when dropping a topic matters most.
     */
    excludedTopicIds: string[];
    onToggleExcluded: (topicId: string) => void;
    /** A newer plan is on its way, so the current rows are shown but marked as not yet the answer. */
    isRefreshing?: boolean;
}

const formatWindow = (releaseDate: string, dueDate: string) => {
    if (!releaseDate) return 'No date yet';

    const start = showDate({ date: releaseDate, short: true });

    // A fixed sequence item may have no end date, so a single date is a real state here rather
    // than missing data. It reads on the schedule exactly as a hand-scheduled topic with no due
    // date does.
    return dueDate ? `${start} to ${showDate({ date: dueDate, short: true })}` : start;
};

/**
 * What assigning the sequence will do to this class, one row per topic in sequence order.
 *
 * Follows the treatment of the admin builder's SequenceItemsTable, down to reusing its classes, so
 * the two tables read as the same thing seen from either end. Two differences: there is no
 * reordering, because the order is the sequence's rather than the leader's, and skipped topics
 * appear as muted rows with a reason instead of being dropped, so the counts above reconcile with
 * what is on screen.
 */
const SequenceAssignmentPreviewTable = ({
    items,
    overrides,
    errorsByTopic,
    editingTopicId,
    onStartEditing,
    onStopEditing,
    onChangeDate,
    allowDateEditing,
    excludedTopicIds,
    onToggleExcluded,
    isRefreshing = false
}: SequenceAssignmentPreviewTableProps) => {
    if (!items.length) return null;

    return (
        <>
            {/* Dimming the rows alone is easy to miss, so the wait is also stated. The same spinner as
                the first load, scaled down, so a re-run reads as the same kind of wait rather than a
                different mechanism. Matches how the admin topic picker shows a re-query. */}
            {isRefreshing ? (
                <div className="sequence-preview-refreshing" data-test="sequence-preview-refreshing">
                    <CircularProgress size={18} />
                    <Paragraph text="Working out the dates for this class" />
                </div>
            ) : null}

            <div className="sequence-items-table" aria-busy={isRefreshing} data-test="sequence-preview-table">
                <Grid container className="sequence-items-table-head" alignItems="center">
                    <Grid item xs={5}>
                        <Paragraph text="Scheduled dates" customClass="sequence-items-table-heading" />
                    </Grid>
                    <Grid item xs={5}>
                        <Paragraph text="Topic name" customClass="sequence-items-table-heading" />
                    </Grid>
                    <Grid item xs={2} />
                </Grid>

                {items.map((item) => {
                    const { releaseDate, dueDate } = resolveRowDates(item, overrides);
                    const isExcluded = excludedTopicIds.includes(item.topic.id);
                    // A dropped row has no dates to change: it is not being created. Closing the
                    // editor rather than only hiding the pencil, so a row dropped mid-edit does not
                    // leave its pickers open below it.
                    const isEditing = allowDateEditing && !isExcluded && editingTopicId === item.topic.id;
                    const rowErrors = errorsByTopic[item.topic.id] || [];

                    return (
                        <Grid
                            container
                            key={item.topic.id}
                            alignItems="center"
                            className={`sequence-items-table-row ${item.skipped ? 'sequence-preview-row-skipped' : ''} ${
                                isExcluded ? 'sequence-preview-row-excluded' : ''
                            }`}
                            data-test={`sequence-preview-row-${item.topic.id}`}>
                            <Grid item xs={5}>
                                {/* A row that is not being created has no window, and says so rather
                                    than showing dates nothing will ever exist on. True of a dropped
                                    row and of a skipped one alike: on an interval sequence those
                                    dates have already gone to the topics below, which closed the gap,
                                    so leaving them here would show the same week twice. The tag and
                                    the line underneath say which of the two it is. */}
                                <Paragraph
                                    dataTest={`sequence-preview-window-${item.topic.id}`}
                                    text={isExcluded || item.skipped ? 'Not being scheduled' : formatWindow(releaseDate, dueDate)}
                                />
                                {/* A leader adjusting several rows should be able to see which ones they
                                have touched before committing to the lot. */}
                                {isOverridden(item, overrides) && !isExcluded && !item.skipped ? (
                                    <Paragraph
                                        customClass="sequence-preview-changed-label"
                                        dataTest={`sequence-preview-changed-${item.topic.id}`}
                                        text="Changed for this class"
                                    />
                                ) : null}
                            </Grid>

                            <Grid item xs={5}>
                                <Grid container alignItems="center" spacing={1}>
                                    <Grid item>
                                        <Paragraph text={item.topic.teacherTopicName} isTruncate />
                                    </Grid>
                                    {/* Says why the row is struck through. Without it the strike alone
                                        has to carry the meaning, which reads as a rendering fault as
                                        easily as a choice. */}
                                    {isExcluded && !item.skipped ? (
                                        <Grid item>
                                            <span data-test={`sequence-preview-removed-tag-${item.topic.id}`}>
                                                <CommonTag
                                                    name="Removed"
                                                    bgColor="#D6D1CB"
                                                    textColor="#000"
                                                    contrast={false}
                                                    sx={{ fontSize: '12px', height: '24px' }}
                                                />
                                            </span>
                                        </Grid>
                                    ) : null}
                                    {item.skipped ? (
                                        <Grid item>
                                            <span data-test={`sequence-preview-skip-tag-${item.topic.id}`}>
                                                {/* House warm grey, not the light grey the skipped row
                                                itself uses, or the chip would disappear into it. */}
                                                <CommonTag
                                                    name={skipReasonLabel(item.skipReason)}
                                                    bgColor="#D6D1CB"
                                                    textColor="#000"
                                                    contrast={false}
                                                    sx={{ fontSize: '12px', height: '24px' }}
                                                />
                                            </span>
                                        </Grid>
                                    ) : null}
                                </Grid>
                            </Grid>

                            <Grid item xs={2}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {/* A skipped topic is not being created, so there are no dates to
                                    adjust, and an interval schedule's dates are not editable at all.
                                    Nor are a dropped row's, for the same reason as the skip. */}
                                    {item.skipped || isExcluded || !allowDateEditing ? null : isEditing ? (
                                        <CommonIconButton
                                            icon="check"
                                            size="small"
                                            toolTipTitle="Done"
                                            dataTest={`sequence-preview-done-${item.topic.id}`}
                                            onClick={onStopEditing}
                                        />
                                    ) : (
                                        <CommonIconButton
                                            icon="edit"
                                            size="small"
                                            toolTipTitle="Change these dates for this class"
                                            dataTest={`sequence-preview-edit-${item.topic.id}`}
                                            onClick={() => onStartEditing(item.topic.id)}
                                        />
                                    )}

                                    {/*
                                        Dropping a topic, and putting it back (LEA-6596). One control
                                        rather than two, so the row it acts on is never in doubt.

                                        Not offered on a skipped row: that topic is already not being
                                        created, and the server decided so. Offering to drop it would
                                        imply the teacher had a say they do not have here.
                                    */}
                                    {item.skipped ? null : (
                                        <CommonIconButton
                                            icon={isExcluded ? 'undo' : 'close'}
                                            size="small"
                                            toolTipTitle={isExcluded ? 'Undo' : 'Remove'}
                                            dataTest={`sequence-preview-toggle-excluded-${item.topic.id}`}
                                            onClick={() => onToggleExcluded(item.topic.id)}
                                        />
                                    )}
                                </div>
                            </Grid>

                            {/* The date fields get a full-width row of their own rather than being squeezed
                            into the dates column. Two pickers plus their labels need roughly 550px
                            between them, and the column is nowhere near that inside a dialog. */}
                            {isEditing ? (
                                <Grid item xs={12}>
                                    <div className="sequence-preview-edit" data-test={`sequence-preview-edit-fields-${item.topic.id}`}>
                                        <Paragraph
                                            customClass="sequence-preview-edit-heading"
                                            text={`Change these dates for ${item.topic.teacherTopicName}`}
                                        />
                                        <Grid container spacing={3}>
                                            <DateField
                                                xs={12}
                                                sm={6}
                                                md={5}
                                                lg={5}
                                                label="Start"
                                                disablePast
                                                className="sequence-preview-date-field"
                                                name={`preview-start-${item.topic.id}`}
                                                value={parseDateOnly(releaseDate)}
                                                onChange={(event) =>
                                                    onChangeDate(item.topic.id, 'releaseDate', toDateOnly(event.target.value as Date))
                                                }
                                                slotProps={{
                                                    textField: {
                                                        inputProps: { 'data-test': `sequence-preview-start-${item.topic.id}` }
                                                    }
                                                }}
                                            />
                                            <DateField
                                                xs={12}
                                                sm={6}
                                                md={5}
                                                lg={5}
                                                label="End (optional)"
                                                className="sequence-preview-date-field"
                                                minDate={parseDateOnly(releaseDate) || undefined}
                                                name={`preview-end-${item.topic.id}`}
                                                value={parseDateOnly(dueDate)}
                                                onChange={(event) =>
                                                    onChangeDate(item.topic.id, 'dueDate', toDateOnly(event.target.value as Date))
                                                }
                                                slotProps={{
                                                    textField: {
                                                        inputProps: { 'data-test': `sequence-preview-end-${item.topic.id}` }
                                                    }
                                                }}
                                            />
                                        </Grid>
                                    </div>
                                </Grid>
                            ) : null}

                            {item.skipped ? (
                                <Grid item xs={12}>
                                    <Paragraph
                                        customClass="sequence-preview-skip-reason"
                                        dataTest={`sequence-preview-skip-reason-${item.topic.id}`}
                                        text={skipReasonExplanation(item.skipReason)}
                                    />
                                </Grid>
                            ) : null}

                            {/* A warning, not a skip: the class keeps what it has and gains a second copy
                            on these dates. The house warning Alert, as the admin form uses for its
                            overlapping windows, because both mean "that is allowed, but know it". */}
                            {/* Gone the moment the row is dropped, rather than when the next plan comes
                                back. The warning is about a topic being added a second time, and a
                                dropped one is not being added at all, so leaving it up for the 400ms
                                the preview takes to settle would contradict the strike beside it. */}
                            {item.alreadyScheduled && !isExcluded ? (
                                <Grid item xs={12}>
                                    <Alert
                                        data-test={`sequence-preview-already-scheduled-${item.topic.id}`}
                                        className="sequence-preview-warning"
                                        icon={<HelpOutlineIcon sx={{ color: '#F28D00' }} />}
                                        sx={{ backgroundColor: '#FFF6D9' }}
                                        severity="warning">
                                        {item.topic.teacherTopicName} is already on this class&apos;s schedule. Auto-scheduling will add it
                                        again on the dates above, so the class will have it twice.
                                    </Alert>
                                </Grid>
                            ) : null}

                            {rowErrors.map((message) => (
                                <Grid item xs={12} key={message}>
                                    <div data-test={`sequence-preview-error-${item.topic.id}`}>
                                        <CommonError error={message} touched />
                                    </div>
                                </Grid>
                            ))}
                        </Grid>
                    );
                })}
            </div>
        </>
    );
};

export default SequenceAssignmentPreviewTable;
