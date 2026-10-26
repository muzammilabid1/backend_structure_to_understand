import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { deleteSchoolDate } from '../../../graphQl/mutations';
import { getAllSchoolDates } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from '../../Shared/Button/CommonIconButton';
import CommonDraggableTable from '../../Shared/CommonDraggableTable';
import CommonListWithIcon from '../../Shared/CommonListWithIcon';
import CommonLoading from '../../Shared/CommonLoading';
import AddTermModal from '../../Shared/Modals/AddTerm';
import ConfirmationModal from '../../Shared/Modals/ConfirmationModal';

const TermsOverviewAdmin = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error: error, data: terms } = useQuery(getAllSchoolDates);
    const [open, setOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState(null);
    const [willDeleteItemId, setwillDeleteItemId] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteTermMutation, { loading: deleteTermLoading }] = useMutation(deleteSchoolDate, {
        refetchQueries: [{ query: getAllSchoolDates }],
        awaitRefetchQueries: true
    });

    const _onEdit = (termId) => {
        setUpdateValues(terms?.allSchoolDates.find((term) => term.id === termId));
        setOpen(true);
    };

    const _onDelete = (termId) => {
        if (!deleteTermLoading) {
            const term = terms?.allSchoolDates.find((term) => term.id === termId);

            setwillDeleteItemId(term?.id);
            setOpenDeleteItemConfirmationModal(true);
        }
    };

    const addTermListItem = [
        {
            text: 'Add a term',
            icon: 'add',
            iconRight: true,
            bold: true,
            dataTest: 'add-term-button',
            onClick: () => {
                setUpdateValues(null);
                setOpen(!open);
            }
        }
    ];

    const head = [
        {
            accessor: 'col1',
            Header: 'Name'
        },
        {
            accessor: 'col2',
            Header: 'Start at',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col2, b.original?.col2)
        },
        {
            accessor: 'col3',
            Header: 'End at',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        },
        {
            accessor: 'col4',
            Header: 'Academic year'
        },
        {
            accessor: 'col5',
            Header: ''
        }
    ];

    const row = (terms?.allSchoolDates || []).map((term) => {
        return {
            id: term?.id,
            col1: term?.termName,
            col2: term?.startDate,
            col3: term?.endDate,
            col4: term?.termPeriodIndex ?? '-',
            col5: (
                <>
                    <CommonIconButton onClick={() => _onEdit(term.id)} icon="create" />
                    <CommonIconButton onClick={() => _onDelete(term.id)} icon="delete" />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="terms_holiday_overview">
            <div className="header">
                <CommonListWithIcon list={addTermListItem} />
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            {open && <AddTermModal open={open} setOpen={() => setOpen(false)} updateValues={updateValues} />}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    loading={deleteTermLoading}
                    onConfirm={() => {
                        deleteTermMutation({ variables: { id: willDeleteItemId } })
                            .then(() => {
                                callSnackbar('Term removed', 'success');
                                setOpenDeleteItemConfirmationModal(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDeleteItemConfirmationModal(false);
                            });
                    }}
                />
            )}
        </div>
    );
};

export default TermsOverviewAdmin;
