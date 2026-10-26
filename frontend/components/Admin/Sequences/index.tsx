import { gql, useMutation, useQuery } from '@apollo/client';
import { CardActions, Collapse, Grid, Paper } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getAllSubjectsForAdmin, getAllYearGroups } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../shared/Services/handler';
import { IStaticLwpTopicSequence } from '../../../types/entities/IStaticLwpTopicSequence';
import { IStaticLwpYearGroup } from '../../../types/entities/IStaticLwpYearGroup';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCard from '../../Shared/Cards/CommonCard';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonLoading from '../../Shared/CommonLoading';
import CommonPopOver from '../../Shared/CommonPopOver';
import CommonSelectField from '../../Shared/CommonSelectField';
import CommonStatus from '../../Shared/CommonStatus';
import InputField from '../../Shared/InputField/InputField';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';
import Heading1 from '../../Shared/Typography/Heading1';
import Paragraph from '../../Shared/Typography/Paragraph';
import { describeTiming } from './sequenceOrdering';
import SequencesTabs, { SequencesTab } from './SequencesTabs';
/** itemCount is a virtual field, so the "Topics" column needs no client-side counting. */
const getSequences = gql`
    query getSequences($filter: TopicSequenceFilterInput) {
        getSequences(filter: $filter) {
            id
            name
            timingMode
            intervalDays
            itemCount
            logUpdatedAt
            subject {
                id
                name
            }
            yearGroup {
                id
                year
            }
            period {
                index
                shortName
            }
        }
    }
`;

const deleteSequence = gql`
    mutation deleteSequence($id: String!) {
        deleteSequence(id: $id) {
            status
            msg
        }
    }
`;

const ALL = '';

const AdminSequences = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filters live in the URL so they survive a refresh and are still applied when
    // the admin comes back from the create or edit screen.
    const subjectId = searchParams.get('subjectId') || ALL;
    const yearGroupId = searchParams.get('yearGroupId') || ALL;
    const searchFromUrl = searchParams.get('search') || '';

    const [isFilterOpen, setIsFilterOpen] = useState(Boolean(subjectId || yearGroupId || searchFromUrl));
    const [sequenceToDelete, setSequenceToDelete] = useState<IStaticLwpTopicSequence | null>(null);

    // The filter controls edit a draft. Nothing re-queries until Apply is pressed,
    // which is how the rest of the admin filters behave.
    const [draft, setDraft] = useState({ subjectId, yearGroupId, search: searchFromUrl });

    useEffect(() => {
        setDraft({ subjectId, yearGroupId, search: searchFromUrl });
    }, [subjectId, yearGroupId, searchFromUrl]);

    const {
        data: sequencesData,
        loading: sequencesLoading,
        error: sequencesError
    } = useQuery(getSequences, {
        variables: {
            filter: {
                subjectId: subjectId || null,
                yearGroupId: yearGroupId || null,
                search: searchFromUrl || null
            }
        },
        fetchPolicy: 'network-only'
    });

    const { data: subjectsData } = useQuery(getAllSubjectsForAdmin);
    const { data: yearGroupsData } = useQuery(getAllYearGroups);

    const [deleteSequenceMutation, { loading: deleteLoading }] = useMutation(deleteSequence, {
        refetchQueries: ['getSequences'],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, sequencesError);
    }, [sequencesError]);

    const applyFilters = () => {
        const query: Record<string, string> = {};

        if (draft.subjectId) query.subjectId = draft.subjectId;
        if (draft.yearGroupId) query.yearGroupId = draft.yearGroupId;
        if (draft.search.trim()) query.search = draft.search.trim();

        router?.push({ pathname: '/admin/sequences', query });
    };

    const resetFilters = () => {
        setDraft({ subjectId: ALL, yearGroupId: ALL, search: '' });
        router?.push({ pathname: '/admin/sequences' });
    };

    const sequences: IStaticLwpTopicSequence[] = sequencesData?.getSequences || [];
    const hasFilters = Boolean(subjectId || yearGroupId || searchFromUrl);

    const header = [
        {
            Header: 'Name',
            accessor: 'col1',
            // col1 renders a clickable element now, and the default comparison would stringify it to
            // the same value for every row and quietly stop sorting. Compared on the plain name kept
            // beside it on the row instead.
            sortType: (rowA, rowB) => String(rowA.original.name ?? '').localeCompare(String(rowB.original.name ?? ''))
        },
        { Header: 'Subject', accessor: 'col2' },
        { Header: 'Year group', accessor: 'col3' },
        // Two sequences can now differ only by academic year, so without this column they would be
        // indistinguishable in the list.
        { Header: 'Academic year', accessor: 'col4' },
        { Header: 'Timing', accessor: 'col5' },
        { Header: 'Topics', accessor: 'col6' },
        { Header: 'Last updated', accessor: 'col7' },
        { Header: '', accessor: 'col8', disableSortBy: true }
    ];

    const rows = sequences.map((sequence) => ({
        id: sequence.id,
        // Not a column, so it never renders. It is what the Name column sorts on, since the cell
        // itself is an element rather than the name.
        name: sequence.name,
        /*
         * The name is the obvious thing to click, and until now it did nothing: reaching the edit
         * page meant finding it behind the row's overflow menu. The menu keeps its Edit action, since
         * that is where a row's actions live and removing it would be a different surprise.
         */
        col1: (
            <span
                className="sequences-table-name"
                role="link"
                tabIndex={0}
                data-test={`sequence-open-${sequence.id}`}
                onClick={() => router?.push(`/admin/sequences/${sequence.id}`)}
                onKeyDown={(event) => {
                    // Keyboard parity with the anchor this behaves like. Space is included because a
                    // span with role="link" gets none of a real link's built-in handling.
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router?.push(`/admin/sequences/${sequence.id}`);
                    }
                }}>
                {sequence.name}
            </span>
        ),
        col2: sequence.subject?.name,
        col3: sequence.yearGroup?.year,
        col4: sequence.period?.shortName,
        col5: describeTiming(sequence),
        col6: sequence.itemCount,
        col7: showDate({ date: sequence.logUpdatedAt, short: true }),
        col8: (
            <div style={{ display: 'flex', justifyContent: 'end' }}>
                <CommonPopOver bold icon="more_horiz" dataTest={`sequence-actions-${sequence.id}`}>
                    <div
                        className="schedule-table-actions-container"
                        data-test={`sequence-action-edit-${sequence.id}`}
                        onClick={() => router?.push(`/admin/sequences/${sequence.id}`)}>
                        <span className="material-icons">edit</span>
                        <span>Edit</span>
                    </div>
                    <div
                        className="schedule-table-actions-container"
                        data-test={`sequence-action-delete-${sequence.id}`}
                        onClick={() => setSequenceToDelete(sequence)}>
                        <span className="material-icons">delete</span>
                        <span>Delete</span>
                    </div>
                </CommonPopOver>
            </div>
        )
    }));

    return (
        <div className="admin-sequences" data-test="admin-sequences-page">
            <Grid container alignItems="center" justifyContent="space-between">
                <Heading1 text="Sequences" />
                <Grid>
                    <LWPButton
                        btnText="Create sequence"
                        dataTest="create-sequence-button"
                        onClick={() => router?.push('/admin/sequences/new')}
                        color="inherit"
                        variant="text"
                        endIcon="add"
                    />
                    <LWPButton
                        color="inherit"
                        variant="text"
                        btnText="Filter"
                        dataTest="sequences-filter-button"
                        onClick={() => setIsFilterOpen((open) => !open)}
                        endIcon={isFilterOpen ? 'expand_less' : 'expand_more'}
                    />
                </Grid>
            </Grid>

            <SequencesTabs active={SequencesTab.ClassSequences} />

            <Paragraph text="A sequence is a reusable, ordered list of topics that a school leader can assign to a class in one action." />

            <Collapse style={{ maxWidth: '750px', margin: 'auto', marginBottom: 24 }} in={isFilterOpen}>
                {/* feeds-filter-container is the house filter card, which right-aligns its
                    Reset and Apply buttons. */}
                <CommonCard className="feeds-filter-container">
                    <Grid container spacing={3}>
                        <CommonSelectField
                            md={6}
                            lg={6}
                            name="subjectId"
                            label="Subject"
                            displayEmpty
                            shrink
                            dataTest="sequences-filter-subject"
                            value={draft.subjectId}
                            options={[
                                { key: ALL, value: 'All subjects' },
                                ...(subjectsData?.getSubjectsForAdmin || []).map((subject: { id: string; name: string }) => ({
                                    key: subject.id,
                                    value: subject.name
                                }))
                            ]}
                            onChange={(event: React.ChangeEvent<{ value: string }>) =>
                                setDraft((current) => ({ ...current, subjectId: event.target.value }))
                            }
                        />
                        <CommonSelectField
                            md={6}
                            lg={6}
                            name="yearGroupId"
                            label="Year group"
                            displayEmpty
                            shrink
                            dataTest="sequences-filter-year-group"
                            value={draft.yearGroupId}
                            options={[
                                { key: ALL, value: 'All year groups' },
                                ...(yearGroupsData?.allYearGroup || []).map((yearGroup: IStaticLwpYearGroup) => ({
                                    key: yearGroup.id,
                                    value: yearGroup.year
                                }))
                            ]}
                            onChange={(event: React.ChangeEvent<{ value: string }>) =>
                                setDraft((current) => ({ ...current, yearGroupId: event.target.value }))
                            }
                        />
                        <InputField
                            md={12}
                            lg={12}
                            name="search"
                            label="Search by name"
                            placeholder="Search"
                            startIcon="search"
                            dataTest="sequences-filter-search"
                            value={draft.search}
                            onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
                            onKeyDown={(event: React.KeyboardEvent) => {
                                if (event.key === 'Enter') applyFilters();
                            }}
                        />
                    </Grid>

                    <CardActions>
                        <LWPButton
                            size="large"
                            variant="contained"
                            color="inherit"
                            btnText="Reset"
                            dataTest="sequences-filter-reset"
                            onClick={resetFilters}
                        />
                        <LWPButton
                            size="large"
                            variant="contained"
                            color="primary"
                            btnText="Apply"
                            dataTest="sequences-filter-apply"
                            onClick={applyFilters}
                        />
                    </CardActions>
                </CommonCard>
            </Collapse>

            {sequencesLoading ? (
                <CommonLoading />
            ) : sequences.length ? (
                <CommonDraggableTable columns={header} rows={rows} customClass="domain_table" dataTest="sequences-table" />
            ) : (
                <Paper className="no-result-found">
                    <CommonStatus
                        className="no_match_item_status"
                        dataTest="sequences-empty-state"
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        heading={hasFilters ? 'No sequences match these filters' : 'No sequences yet'}
                        subHeading={
                            hasFilters
                                ? 'Try a different subject, year group or name'
                                : 'Create a sequence and it will appear here, ready to assign to a class'
                        }
                    />
                </Paper>
            )}

            <ConfirmationModal
                open={Boolean(sequenceToDelete)}
                onCancel={() => setSequenceToDelete(null)}
                onConfirm={() => {
                    deleteSequenceMutation({ variables: { id: sequenceToDelete?.id } })
                        .then(({ data }) => {
                            // A sequence that matched nothing comes back as a resolved promise
                            // carrying status 'fail', not as an error, so reporting success on
                            // anything that did not throw would claim a deletion that never happened.
                            if (data?.deleteSequence?.status === 'ok') {
                                callSnackbar('Sequence deleted successfully!', 'success');
                            } else {
                                callSnackbar(data?.deleteSequence?.msg || 'That sequence could not be deleted', 'error');
                            }

                            setSequenceToDelete(null);
                        })
                        .catch((error) => {
                            callSnackbar(error, 'error');
                            setSequenceToDelete(null);
                        });
                }}
                loading={deleteLoading}
                heading="Delete sequence"
                btnText="Delete">
                Are you sure you want to delete {sequenceToDelete?.name}? Classes that have already been assigned this sequence keep their
                scheduled topics.
            </ConfirmationModal>
        </div>
    );
};

export default AdminSequences;
