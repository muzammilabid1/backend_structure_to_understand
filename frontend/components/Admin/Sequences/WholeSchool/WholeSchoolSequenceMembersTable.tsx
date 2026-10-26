import { gql, useQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { useMemo } from 'react';

import { getAllYearGroups } from '../../../../graphQl/queries';
import { showDate } from '../../../../shared/Services/handler';
import { IWholeSchoolSequenceCandidate } from '../../../../types/entities/IStaticLwpWholeSchoolSequence';
import { IStaticLwpYearGroup } from '../../../../types/entities/IStaticLwpYearGroup';
import CommonSelectField from '../../../Shared/CommonSelectField';
import CommonStatus from '../../../Shared/CommonStatus';
import Paragraph from '../../../Shared/Typography/Paragraph';

/**
 * The class sequences that may be put against a year group, for one subject and academic year.
 *
 * The server applies every eligibility rule, so what comes back is exactly what may be saved: fixed
 * sequences only, this subject, this academic year, and never the `Unknown` year group.
 */
const getCandidateSequencesForWholeSchool = gql`
    query getCandidateSequencesForWholeSchool($subjectId: String!, $periodIndex: Float!) {
        getCandidateSequencesForWholeSchool(subjectId: $subjectId, periodIndex: $periodIndex) {
            id
            name
            yearGroupId
            yearGroupName
            startDate
            endDate
        }
    }
`;

/**
 * The year group the Wonde import assigns to a class it cannot map.
 *
 * Excluded here as well as on the server. The server is what guarantees it; this stops the row being
 * rendered at all, so an admin is never shown an empty picker for a year group that exists only as an
 * import failure.
 */
const UNKNOWN_YEAR_GROUP = 'Unknown';

interface WholeSchoolSequenceMembersTableProps {
    subjectId: string;
    /** The form's raw select value, so '' means the admin has not chosen an academic year yet. */
    periodIndex: string;
    /** Chosen sequence per year group id, '' where the year group is not covered. */
    value: Record<string, string>;
    onChange: (yearGroupId: string, sequenceId: string) => void;
    /**
     * Every row read-only, because a school has already scheduled this (LEA-6700).
     *
     * The reason is stated once above the table rather than on each row: it is the same reason for
     * every year group, and eight copies of it would read as eight separate problems.
     */
    disabled?: boolean;
}

/**
 * One row per year group: the year group, the class sequence it receives, and the dates that
 * sequence would run on.
 *
 * **Every year group is a row, whether or not it has a sequence.** A partially covered whole-school
 * sequence is valid and saveable, because content for one year group is often not ready and holding
 * up the others would help nobody. The empty rows are also what make the gaps visible, which is what
 * publishing will warn about in the next slice.
 *
 * The year group list is read from the API and never hardcoded: production carries more of them than
 * a development database does.
 */
const WholeSchoolSequenceMembersTable = ({ subjectId, periodIndex, value, onChange, disabled }: WholeSchoolSequenceMembersTableProps) => {
    const { data: yearGroupsData } = useQuery(getAllYearGroups);

    const scopeChosen = Boolean(subjectId) && periodIndex !== '';

    const {
        data: candidatesData,
        previousData: previousCandidatesData,
        loading: candidatesLoading
    } = useQuery(getCandidateSequencesForWholeSchool, {
        variables: { subjectId, periodIndex: Number(periodIndex) },
        skip: !scopeChosen,
        fetchPolicy: 'network-only'
    });

    const yearGroups: IStaticLwpYearGroup[] = useMemo(
        () => (yearGroupsData?.allYearGroup || []).filter((yearGroup: IStaticLwpYearGroup) => yearGroup.year !== UNKNOWN_YEAR_GROUP),
        [yearGroupsData]
    );

    /*
     * `previousData` keeps the rows on screen while a re-query runs after the academic year changes,
     * rather than blanking the table and shifting the page under the admin. The same reason
     * SequenceTopicPicker uses it.
     */
    const candidates: IWholeSchoolSequenceCandidate[] =
        candidatesData?.getCandidateSequencesForWholeSchool || previousCandidatesData?.getCandidateSequencesForWholeSchool || [];

    const candidatesByYearGroupId = useMemo(() => {
        const grouped = new Map<string, IWholeSchoolSequenceCandidate[]>();

        candidates.forEach((candidate) => {
            grouped.set(candidate.yearGroupId, [...(grouped.get(candidate.yearGroupId) || []), candidate]);
        });

        return grouped;
    }, [candidates]);

    const candidateById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);

    /** The chosen sequence's own span, or a dash: this column never invites an edit. */
    const describeDates = (sequenceId: string): string => {
        const candidate = sequenceId ? candidateById.get(sequenceId) : undefined;

        if (!candidate?.startDate) return '-';

        const start = showDate({ date: candidate.startDate, short: true });

        // A fixed sequence may leave its last topic's window open, so there is genuinely no end date
        // to show rather than one that failed to load.
        return candidate.endDate ? `${start} to ${showDate({ date: candidate.endDate, short: true })}` : `${start} onwards`;
    };

    if (!scopeChosen) {
        return (
            <CommonStatus
                className="no_match_item_status"
                dataTest="whole-school-sequence-members-no-scope"
                heading="Choose a subject and academic year first"
                subHeading="The topic sequences on offer depend on both"
            />
        );
    }

    return (
        <div data-test="whole-school-sequence-members-table">
            <Paragraph text="Each year group gets one of your existing topic sequences. You can leave a year group empty and come back to it." />

            {candidatesLoading && !candidates.length ? (
                // An inline spinner, not CommonLoading: that is a page-level treatment with its own
                // heading and reload prompt, and dropping it inside a card mid-form reads as an error.
                <Grid container justifyContent="center" sx={{ padding: '24px 0' }}>
                    <CircularProgress size={28} />
                </Grid>
            ) : (
                yearGroups.map((yearGroup) => {
                    const options = candidatesByYearGroupId.get(yearGroup.id) || [];
                    const chosen = value[yearGroup.id] || '';

                    return (
                        <Grid
                            container
                            spacing={2}
                            alignItems="center"
                            key={yearGroup.id}
                            data-test={`whole-school-member-row-${yearGroup.id}`}>
                            <Grid item xs={12} md={3}>
                                <Paragraph text={yearGroup.year} />
                            </Grid>

                            <CommonSelectField
                                md={6}
                                lg={6}
                                name={`membersByYearGroupId.${yearGroup.id}`}
                                label="Topic sequence"
                                displayEmpty
                                shrink
                                dataTest={`whole-school-member-select-${yearGroup.id}`}
                                value={chosen}
                                // No sequence is a real choice rather than an absence of one, so it is
                                // an option in the list: it is how an admin clears a year group again.
                                options={[
                                    { key: '', value: options.length ? 'No sequence' : 'No sequences available' },
                                    ...options.map((candidate) => ({ key: candidate.id, value: candidate.name }))
                                ]}
                                disabled={disabled || !options.length}
                                onChange={(event: React.ChangeEvent<{ value: string }>) => onChange(yearGroup.id, event.target.value)}
                            />

                            <Grid item xs={12} md={3}>
                                <Paragraph dataTest={`whole-school-member-dates-${yearGroup.id}`} text={describeDates(chosen)} />
                            </Grid>
                        </Grid>
                    );
                })
            )}
        </div>
    );
};

export default WholeSchoolSequenceMembersTable;
