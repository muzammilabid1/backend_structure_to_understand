import { Grid } from '@mui/material';
import React from 'react';

import { showDate } from '../../../shared/Services/handler';
import { IWholeSchoolSequencePreviewRow } from '../../../types/entities/IWholeSchoolSequencePreview';
import CommonTag from '../../Shared/CommonTag';
import Paragraph from '../../Shared/Typography/Paragraph';
import { describeRowSkippedTopics, formatRowDates, isRowCompleted, skipReasonExplanation, skipReasonLabel } from './wholeSchoolPreview';

interface WholeSchoolPreviewTableProps {
    rows: IWholeSchoolSequencePreviewRow[];
}

/**
 * What the school would receive, one row per year group (LEA-6697).
 *
 * Follows the class-level `SequenceAssignmentPreviewTable` down to reusing its classes, so the two
 * read as the same thing at two scales. Three differences, all of them deliberate:
 *
 *   - **nothing is editable.** A row here is a whole sequence of topics rather than one topic, so a
 *     single pair of dates on it could not be changed to mean anything. There is no date editing
 *     anywhere in the whole-school flow;
 *   - **the design's Term column is dropped**, because nothing in the data model represents a term.
 *     V1 dropped it for the same reason;
 *   - **skipped rows are shown with their reason** rather than hidden, which is what lets the counts
 *     above the table reconcile with what is on screen.
 *
 * A row that is being scheduled can still be dropping topics whose dates have passed (LEA-6699). It
 * says so on its own line, in the same place and style a skipped row states its reason, so a leader
 * reads one explanation per row wherever it came from.
 *
 * On the already-scheduled record a year group whose dates have all gone is greyed and badged
 * **Completed**, as the design draws it. Only the text greys: the row keeps its white background and
 * its green bar, which is what separates a year group that has finished from one that was never
 * scheduled. That state cannot arise on the offer, so the table asks for it unconditionally.
 */
const WholeSchoolPreviewTable = ({ rows }: WholeSchoolPreviewTableProps) => {
    if (!rows.length) return null;

    return (
        <div className="sequence-items-table" data-test="whole-school-preview-table">
            <Grid container className="sequence-items-table-head" alignItems="center">
                <Grid item xs={4}>
                    <Paragraph text="Topic sequence" customClass="sequence-items-table-heading" />
                </Grid>
                <Grid item xs={3}>
                    <Paragraph text="Scheduled dates" customClass="sequence-items-table-heading" />
                </Grid>
                <Grid item xs={3}>
                    <Paragraph text="Year group" customClass="sequence-items-table-heading" />
                </Grid>
                <Grid item xs={2}>
                    <Paragraph text="Classes" customClass="sequence-items-table-heading" />
                </Grid>
            </Grid>

            {rows.map((row) => {
                const skippedTopics = describeRowSkippedTopics(row);
                const completed = isRowCompleted(row);

                return (
                    <Grid
                        container
                        key={row.yearGroupId}
                        alignItems="center"
                        className={`sequence-items-table-row ${row.skipped ? 'sequence-preview-row-skipped' : ''} ${
                            completed ? 'sequence-preview-row-completed' : ''
                        }`}
                        data-test={`whole-school-preview-row-${row.yearGroupId}`}>
                        <Grid item xs={4}>
                            <Grid container alignItems="center" spacing={1}>
                                <Grid item>
                                    {/* A year group with no member has no sequence to name, and saying so
                                    is the row's whole point. Left blank it would read as a load that
                                    half finished. */}
                                    <Paragraph
                                        text={row.sequenceName || 'No topic sequence'}
                                        dataTest={`whole-school-preview-sequence-${row.yearGroupId}`}
                                        isTruncate
                                    />
                                </Grid>
                                {row.skipped ? (
                                    <Grid item>
                                        <span data-test={`whole-school-preview-skip-tag-${row.yearGroupId}`}>
                                            {/* House warm grey, not the light grey of the skipped row
                                            itself, or the chip disappears into it. */}
                                            <CommonTag
                                                name={skipReasonLabel(row.skipReason)}
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

                        <Grid item xs={3}>
                            <Paragraph
                                text={formatRowDates(row, (date) => showDate({ date, short: true }))}
                                dataTest={`whole-school-preview-dates-${row.yearGroupId}`}
                            />
                        </Grid>

                        <Grid item xs={3}>
                            <Paragraph text={row.yearGroup} dataTest={`whole-school-preview-year-group-${row.yearGroupId}`} />
                        </Grid>

                        <Grid item xs={2}>
                            <Paragraph text={`${row.classCount}`} dataTest={`whole-school-preview-class-count-${row.yearGroupId}`} />
                        </Grid>

                        {/* The design's own second line on a finished row. House grey on a row that
                        keeps its white background and green bar, so "this has happened" reads
                        differently from a skipped row that was never scheduled at all. */}
                        {completed ? (
                            <Grid item xs={12}>
                                <span
                                    className="sequence-preview-completed-tag"
                                    data-test={`whole-school-preview-completed-${row.yearGroupId}`}>
                                    <CommonTag
                                        name="Completed"
                                        textColor="#999591"
                                        contrast={false}
                                        sx={{ height: '36px', '& .MuiChip-label': { px: '16px' } }}
                                    />
                                </span>
                            </Grid>
                        ) : null}

                        {row.skipped ? (
                            <Grid item xs={12}>
                                <Paragraph
                                    customClass="sequence-preview-skip-reason"
                                    dataTest={`whole-school-preview-skip-reason-${row.yearGroupId}`}
                                    text={skipReasonExplanation(row.skipReason)}
                                />
                            </Grid>
                        ) : null}

                        {/* Never both: a skipped row's reason already covers it, and the helper returns
                        null there so the two cannot appear together and contradict each other. */}
                        {skippedTopics ? (
                            <Grid item xs={12}>
                                <Paragraph
                                    customClass="sequence-preview-skip-reason"
                                    dataTest={`whole-school-preview-topics-skipped-${row.yearGroupId}`}
                                    text={skippedTopics}
                                />
                            </Grid>
                        ) : null}
                    </Grid>
                );
            })}
        </div>
    );
};

export default WholeSchoolPreviewTable;
