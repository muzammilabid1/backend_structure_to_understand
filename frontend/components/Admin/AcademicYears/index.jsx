import { useMutation, useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { deleteStaticPeriod } from '../../../graphQl/mutations';
import { getAllStaticPeriods } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import AddAcademicYearModal from './../../Shared/Modals/AddAcademicYear';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';

const AcademicYears = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error: error, data: allStaticPeriods } = useQuery(getAllStaticPeriods);
    const [open, setOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const [willDeleteItemId, setwillDeleteItemId] = useState(null);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteStaticPeriodMutation, { loading: deleteStaticLoading }] = useMutation(deleteStaticPeriod, {
        refetchQueries: [{ query: getAllStaticPeriods }],
        awaitRefetchQueries: true
    });

    const _onEdit = (periodIndex) => {
        setUpdateValues(allStaticPeriods?.allStaticPeriods.find((news) => news.index === periodIndex));
        setOpen(true);
    };

    const _onDelete = (periodIndex) => {
        if (!deleteStaticLoading) {
            const index = allStaticPeriods?.allStaticPeriods?.find((news) => news?.index === periodIndex)?.index;

            setwillDeleteItemId(+index);
            setOpenDeleteItemConfirmationModal(true);
        }
    };

    const heading = ['Short Name', 'Long Name', 'Characters', 'Colours', 'IsCurrentPeriod', 'IsPreviousPeriod', ''];

    const head = heading.map((head, index) => {
        return { accessor: `col${index + 1}`, Header: head };
    });

    const row = (allStaticPeriods?.allStaticPeriods || []).map((staticPeriods) => {
        return {
            id: staticPeriods.index,
            col1: staticPeriods?.shortName,
            col2: staticPeriods?.longName,
            col3: staticPeriods?.characters.join(', '),
            col4: staticPeriods?.colours.join(', '),
            col5: staticPeriods?.isCurrentPeriod ? <span className="material-icons">done</span> : '-',
            col6: staticPeriods?.isPreviousPeriod ? <span className="material-icons">done</span> : '-',
            col7: (
                <div
                    data-test={`${staticPeriods?.isCurrentPeriod ? 'current-year' : staticPeriods?.isPreviousPeriod ? 'previous-year' : 'future-year'}`}>
                    <CommonIconButton dataTest="edit-button" onClick={() => _onEdit(staticPeriods.index)} icon="create" />
                    <CommonIconButton dataTest="delete-button" onClick={() => _onDelete(staticPeriods.index)} icon="delete" />
                </div>
            )
        };
    });

    const addNewsListItem = [
        {
            text: 'Add an academic year',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => {
                setUpdateValues(null);
                setOpen(!open);
            }
        }
    ];

    if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'academic-years-page'}>
            <div className="header">
                <Heading2 text="Academic years" />
                <CommonListWithIcon list={addNewsListItem} />
            </div>
            <CommonDraggableTable rows={row} columns={head} customClass="row-height" />
            {open && <AddAcademicYearModal open={open} setOpen={() => setOpen(false)} updateValues={updateValues} />}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    loading={deleteStaticLoading}
                    onConfirm={() => {
                        deleteStaticPeriodMutation({ variables: { index: willDeleteItemId } })
                            .then(() => {
                                callSnackbar('News item removed', 'success');
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

export default AcademicYears;
