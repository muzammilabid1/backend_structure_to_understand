import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid, Paper } from '@mui/material';
import { WholeSchoolSequenceStatus } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { handleErrorSnackbar, showDate, ThemeContext } from '../../../../shared/Services/handler';
import { IStaticLwpWholeSchoolSequence } from '../../../../types/entities/IStaticLwpWholeSchoolSequence';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonDraggableTable from '../../../Shared/CommonDraggableTable';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonPopOver from '../../../Shared/CommonPopOver';
import CommonStatus from '../../../Shared/CommonStatus';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Heading1 from '../../../Shared/Typography/Heading1';
import Paragraph from '../../../Shared/Typography/Paragraph';
import SequencesTabs, { SequencesTab } from '../SequencesTabs';

const getWholeSchoolSequences = gql`
    query getWholeSchoolSequences($filter: WholeSchoolSequenceFilterInput) {
        getWholeSchoolSequences(filter: $filter) {
            id
            status
            logUpdatedAt
            subject {
                id
                name
            }
            period {
                index
                shortName
            }
        }
    }
`;

const deleteWholeSchoolSequence = gql`
    mutation deleteWholeSchoolSequence($id: String!) {
        deleteWholeSchoolSequence(id: $id) {
            status
            msg
        }
    }
`;

/** Draft and Published read better in a table than the enum's own spelling of them. */
const statusLabel = (status: WholeSchoolSequenceStatus): string => (status === WholeSchoolSequenceStatus.PUBLISHED ? 'Published' : 'Draft');

/**
 * The admin list of whole-school sequences.
 *
 * There is no filter row, unlike the class sequence list beside it. That one holds a sequence per
 * subject, year group and year and runs to hundreds of rows; this one holds at most one per subject
 * per year, so filtering it would be furniture over a list an admin reads whole. The API takes a
 * filter regardless, because slice 4 needs it to find the published sequence for a school's year.
 */
const AdminWholeSchoolSequences = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [sequenceToDelete, setSequenceToDelete] = useState<IStaticLwpWholeSchoolSequence | null>(null);

    const { data, loading, error } = useQuery(getWholeSchoolSequences, {
        variables: { filter: {} },
        fetchPolicy: 'network-only'
    });

    const [deleteWholeSchoolSequenceMutation, { loading: deleteLoading }] = useMutation(deleteWholeSchoolSequence, {
        refetchQueries: ['getWholeSchoolSequences'],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    const wholeSchoolSequences: IStaticLwpWholeSchoolSequence[] = data?.getWholeSchoolSequences || [];

    const header = [
        {
            Header: 'Subject',
            accessor: 'col1',
            // col1 renders a clickable element, and the default comparison would stringify every row
            // to the same value and quietly stop sorting. Compared on the plain name kept beside it.
            sortType: (rowA, rowB) => String(rowA.original.subjectName ?? '').localeCompare(String(rowB.original.subjectName ?? ''))
        },
        { Header: 'Academic year', accessor: 'col2' },
        { Header: 'Status', accessor: 'col3' },
        { Header: 'Last updated', accessor: 'col4' },
        { Header: '', accessor: 'col5', disableSortBy: true }
    ];

    const open = (id: string) => router?.push(`/admin/sequences/whole-school/${id}`);

    const rows = wholeSchoolSequences.map((wholeSchoolSequence) => ({
        id: wholeSchoolSequence.id,
        // Not a column, so it never renders. It is what the Subject column sorts on, since the cell
        // itself is an element rather than the name.
        subjectName: wholeSchoolSequence.subject?.name,
        col1: (
            <span
                className="sequences-table-name"
                role="link"
                tabIndex={0}
                data-test={`whole-school-sequence-open-${wholeSchoolSequence.id}`}
                onClick={() => open(wholeSchoolSequence.id)}
                onKeyDown={(event) => {
                    // Keyboard parity with the anchor this behaves like. Space is included because a
                    // span with role="link" gets none of a real link's built-in handling.
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        open(wholeSchoolSequence.id);
                    }
                }}>
                {wholeSchoolSequence.subject?.name}
            </span>
        ),
        col2: wholeSchoolSequence.period?.shortName,
        col3: statusLabel(wholeSchoolSequence.status),
        col4: showDate({ date: wholeSchoolSequence.logUpdatedAt, short: true }),
        col5: (
            <div style={{ display: 'flex', justifyContent: 'end' }}>
                <CommonPopOver bold icon="more_horiz" dataTest={`whole-school-sequence-actions-${wholeSchoolSequence.id}`}>
                    <div
                        className="schedule-table-actions-container"
                        data-test={`whole-school-sequence-action-edit-${wholeSchoolSequence.id}`}
                        onClick={() => open(wholeSchoolSequence.id)}>
                        <span className="material-icons">edit</span>
                        <span>Edit</span>
                    </div>
                    <div
                        className="schedule-table-actions-container"
                        data-test={`whole-school-sequence-action-delete-${wholeSchoolSequence.id}`}
                        onClick={() => setSequenceToDelete(wholeSchoolSequence)}>
                        <span className="material-icons">delete</span>
                        <span>Delete</span>
                    </div>
                </CommonPopOver>
            </div>
        )
    }));

    return (
        <div className="admin-sequences" data-test="admin-whole-school-sequences-page">
            <Grid container alignItems="center" justifyContent="space-between">
                <Heading1 text="Sequences" />
                <Grid>
                    <LWPButton
                        btnText="Create whole-school sequence"
                        dataTest="create-whole-school-sequence-button"
                        onClick={() => router?.push('/admin/sequences/whole-school/new')}
                        color="inherit"
                        variant="text"
                        endIcon="add"
                    />
                </Grid>
            </Grid>

            <SequencesTabs active={SequencesTab.WholeSchoolSequences} />

            {/* The gap below this is the page's own, because there is no filter row here to supply
                one. On the class sequences tab the filter Collapse sits between the paragraph and
                the table and carries the 24px; without it the card would sit flush against the text. */}
            <Paragraph
                customClass="whole-school-sequences-intro"
                text="A whole-school sequence gives each year group one of your class sequences, so a school leader can schedule every class in their school in one action."
            />

            {loading ? (
                <CommonLoading />
            ) : wholeSchoolSequences.length ? (
                <CommonDraggableTable columns={header} rows={rows} customClass="domain_table" dataTest="whole-school-sequences-table" />
            ) : (
                <Paper className="no-result-found">
                    <CommonStatus
                        className="no_match_item_status"
                        dataTest="whole-school-sequences-empty-state"
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        heading="No whole-school sequences yet"
                        subHeading="Create one for a subject and academic year, and it will appear here"
                    />
                </Paper>
            )}

            <ConfirmationModal
                open={Boolean(sequenceToDelete)}
                onCancel={() => setSequenceToDelete(null)}
                onConfirm={() => {
                    deleteWholeSchoolSequenceMutation({ variables: { id: sequenceToDelete?.id } })
                        .then(({ data: deleteData }) => {
                            // A row that matched nothing comes back as a resolved promise carrying
                            // status 'fail', not as an error, so reporting success on anything that
                            // did not throw would claim a deletion that never happened.
                            if (deleteData?.deleteWholeSchoolSequence?.status === 'ok') {
                                callSnackbar('Whole-school sequence deleted successfully!', 'success');
                            } else {
                                callSnackbar(
                                    deleteData?.deleteWholeSchoolSequence?.msg || 'That whole-school sequence could not be deleted',
                                    'error'
                                );
                            }

                            setSequenceToDelete(null);
                        })
                        .catch((deleteError) => {
                            callSnackbar(deleteError, 'error');
                            setSequenceToDelete(null);
                        });
                }}
                loading={deleteLoading}
                heading="Delete whole-school sequence"
                btnText="Delete">
                Are you sure you want to delete the {sequenceToDelete?.subject?.name} sequence for {sequenceToDelete?.period?.shortName}?
                The class sequences it uses are not affected.
            </ConfirmationModal>
        </div>
    );
};

export default AdminWholeSchoolSequences;
