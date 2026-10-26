import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Alert, Grid, Paper } from '@mui/material';
import React from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from 'react-beautiful-dnd';

import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDragIndicator from '../../Shared/CommonDragIndicator';
import CommonError from '../../Shared/CommonError';
import CommonStatus from '../../Shared/CommonStatus';
import DateField from '../../Shared/InputField/DateField';
import Paragraph from '../../Shared/Typography/Paragraph';
import { parseDateOnly, SequenceDraftItem, toDateOnly } from './sequenceOrdering';

const DROPPABLE_ID = 'sequence-items';

interface SequenceItemsTableProps {
    items: SequenceDraftItem[];
    /** Fixed sequences take typed dates per topic. Interval sequences generate them. */
    isFixed: boolean;
    /** Blocking date problems, keyed by topic id, shown under the row they belong to. */
    errorsByTopic: Record<string, string[]>;
    /** Overlap warnings, keyed by topic id, shown under the row they belong to. */
    warningsByTopic: Record<string, string[]>;
    onChangeDate: (index: number, field: 'startDate' | 'endDate', value: string) => void;
    /**
     * Called when a date field is committed, so the list can re-sort.
     *
     * Wired to the text field's blur only. It must not also be wired to the picker's
     * onAccept, which fires in the same tick as onChange: a re-sort reading the values
     * from that render would then write back the array as it was before the date the
     * admin had just picked.
     */
    onCommitDates: () => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onRemove: (index: number) => void;
}

/**
 * The ordered list of topics in the sequence, with their dates in fixed mode only.
 *
 * An interval sequence is its topics and their order and nothing else (LEA-6595), so it has no date
 * column at all rather than an empty one.
 *
 * Reordering is available by drag and by the up and down buttons. The buttons are
 * not only an accessible fallback: they are the reliable path for keyboard users
 * and for tests, where dragging is awkward to drive.
 *
 * In fixed mode a drag states the intended order but never rewrites dates. The
 * form reports the disagreement and blocks submit until the admin changes the
 * dates themselves, because these are real dates on a real schedule.
 */
const SequenceItemsTable = ({
    items,
    isFixed,
    errorsByTopic,
    warningsByTopic,
    onChangeDate,
    onCommitDates,
    onReorder,
    onRemove
}: SequenceItemsTableProps) => {
    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        if (result.destination.index === result.source.index) return;

        onReorder(result.source.index, result.destination.index);
    };

    if (!items.length) {
        return (
            <Paper className="no-result-found">
                <CommonStatus
                    className="no_match_item_status"
                    dataTest="sequence-items-empty-state"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    heading="No topics yet"
                    subHeading="Add topics above and they will appear here, in the order a class will receive them"
                />
            </Paper>
        );
    }

    return (
        <div className="sequence-items-table" data-test="sequence-items-table">
            {/* Fixed mode only, matching the row below it. An interval sequence carries no dates
                (LEA-6595), so it has no column here and the topic name takes the width back. */}
            <Grid container className="sequence-items-table-head" alignItems="center">
                <Grid item xs={1} />
                {isFixed && (
                    <Grid item xs={5}>
                        <Paragraph text="Scheduled dates" customClass="sequence-items-table-heading" />
                    </Grid>
                )}
                <Grid item xs={isFixed ? 4 : 9}>
                    <Paragraph text="Topic name" customClass="sequence-items-table-heading" />
                </Grid>
                <Grid item xs={2} />
            </Grid>

            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={DROPPABLE_ID} type={DROPPABLE_ID}>
                    {(droppableProvided) => (
                        <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                            {items.map((item, index) => (
                                <Draggable draggableId={item.topicId} index={index} key={item.topicId}>
                                    {(draggableProvided) => (
                                        <div
                                            ref={draggableProvided.innerRef}
                                            {...draggableProvided.draggableProps}
                                            {...draggableProvided.dragHandleProps}
                                            data-test={`sequence-item-row-${item.topicId}`}>
                                            <Grid container alignItems="center" className="sequence-items-table-row">
                                                <Grid item xs={1}>
                                                    <CommonDragIndicator />
                                                </Grid>

                                                {/*
                                                    Fixed mode only. An interval sequence carries no
                                                    dates at all (LEA-6595), so there is no window to
                                                    render: it used to show a read-only one generated
                                                    from the anchor plus the interval.

                                                    The column goes rather than rendering empty. A
                                                    blank date cell on every row reads as data that
                                                    failed to load rather than as data that does not
                                                    exist.
                                                */}
                                                {isFixed && (
                                                    <Grid item xs={5}>
                                                        <Grid container spacing={1}>
                                                            <DateField
                                                                md={6}
                                                                lg={6}
                                                                label="Start"
                                                                name={`start-${item.topicId}`}
                                                                value={parseDateOnly(item.startDate)}
                                                                onChange={(event) =>
                                                                    onChangeDate(index, 'startDate', toDateOnly(event.target.value as Date))
                                                                }
                                                                slotProps={{
                                                                    textField: {
                                                                        onBlur: onCommitDates,
                                                                        inputProps: {
                                                                            'data-test': `sequence-item-start-${item.topicId}`
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <DateField
                                                                md={6}
                                                                lg={6}
                                                                label="End (optional)"
                                                                name={`end-${item.topicId}`}
                                                                minDate={parseDateOnly(item.startDate) || undefined}
                                                                value={parseDateOnly(item.endDate)}
                                                                onChange={(event) =>
                                                                    onChangeDate(index, 'endDate', toDateOnly(event.target.value as Date))
                                                                }
                                                                slotProps={{
                                                                    textField: {
                                                                        onBlur: onCommitDates,
                                                                        inputProps: {
                                                                            'data-test': `sequence-item-end-${item.topicId}`
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                )}

                                                <Grid item xs={isFixed ? 4 : 9}>
                                                    <Paragraph text={item.topicName} isTruncate />
                                                </Grid>

                                                <Grid item xs={2}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <CommonIconButton
                                                            icon="arrow_upward"
                                                            size="small"
                                                            toolTipTitle="Move up"
                                                            disabled={index === 0}
                                                            dataTest={`sequence-item-move-up-${item.topicId}`}
                                                            onClick={() => onReorder(index, index - 1)}
                                                        />
                                                        <CommonIconButton
                                                            icon="arrow_downward"
                                                            size="small"
                                                            toolTipTitle="Move down"
                                                            disabled={index === items.length - 1}
                                                            dataTest={`sequence-item-move-down-${item.topicId}`}
                                                            onClick={() => onReorder(index, index + 1)}
                                                        />
                                                        <CommonIconButton
                                                            icon="delete"
                                                            size="small"
                                                            toolTipTitle="Remove topic"
                                                            dataTest={`sequence-item-remove-${item.topicId}`}
                                                            onClick={() => onRemove(index)}
                                                        />
                                                    </div>
                                                </Grid>

                                                {/* Findings sit under the row they belong to, so the admin can see
                                                    which topic to change without matching names to a list below. */}
                                                {(errorsByTopic[item.topicId] || []).map((message) => (
                                                    <Grid item xs={12} key={message}>
                                                        <div data-test={`sequence-item-error-${item.topicId}`}>
                                                            <CommonError error={message} touched />
                                                        </div>
                                                    </Grid>
                                                ))}

                                                {(warningsByTopic[item.topicId] || []).map((message) => (
                                                    <Grid item xs={12} key={message}>
                                                        <Alert
                                                            data-test={`sequence-item-warning-${item.topicId}`}
                                                            className="sequence-item-warning"
                                                            icon={<HelpOutlineIcon sx={{ color: '#F28D00' }} />}
                                                            sx={{ backgroundColor: '#FFF6D9' }}
                                                            severity="warning">
                                                            {message}
                                                        </Alert>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {droppableProvided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    );
};

export default SequenceItemsTable;
