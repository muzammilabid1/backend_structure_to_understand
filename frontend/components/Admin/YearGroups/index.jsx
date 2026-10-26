import { useMutation, useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { deleteYearGroup } from '../../../graphQl/mutations';
import { getAllStaticYearGroup } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import AddYearGroupModal from './../../Shared/Modals/AddYearGroup';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';

const YearGroups = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [updateValues, setUpdateValues] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const [willDeleteItemId, setwillDeleteItemId] = useState(null);

    const {
        loading,
        error: error,
        data: allStaticYearGroups
    } = useQuery(getAllStaticYearGroup, { variables: { showHiddenYearGroup: true } });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const [deleteStaticYearGroupMutation, { loading: deleteStaticLoading }] = useMutation(deleteYearGroup, {
        refetchQueries: [{ query: getAllStaticYearGroup, variables: { showHiddenYearGroup: true } }],
        awaitRefetchQueries: true
    });

    const _onEdit = (yearId) => {
        setUpdateValues(allStaticYearGroups?.allYearGroup.find((year) => year.id === yearId));
        setOpen(true);
    };

    const _onDelete = (yearId) => {
        if (!deleteStaticLoading) {
            const id = allStaticYearGroups?.allYearGroup.find((year) => year.id === yearId)?.id;

            setwillDeleteItemId(+id);
            setOpenDeleteItemConfirmationModal(true);
        }
    };

    const heading = ['Index', 'Year', 'Short name', 'Mathscot themes', 'Hidden list', ''];

    const head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Mathscot themes') {
            rowHead.width = 400;
        }

        return rowHead;
    });

    const row = (allStaticYearGroups?.allYearGroup || []).map((allYearGroup) => {
        return {
            id: allYearGroup?.id,
            col1: allYearGroup?.id,
            col2: allYearGroup?.year,
            col3: allYearGroup?.shortName,
            col4: allYearGroup?.mathscotThemes?.length > 0 ? allYearGroup?.mathscotThemes.join(', ') : '-',
            col5: <CommonIconButton disabled icon={allYearGroup?.hiddenFromLists ? 'visibility_off' : 'visibility'} />,
            col6: (
                <>
                    <CommonIconButton onClick={() => _onEdit(allYearGroup.id)} icon="create" />
                    <CommonIconButton onClick={() => _onDelete(allYearGroup.id)} icon="delete" />
                </>
            )
        };
    });

    const addNewsListItem = [
        {
            text: 'Add a year group',
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
        <div className="schools_overview" data-test={'year-groups-page'}>
            <div className="header">
                <Heading2 text="Year groups" />
                <CommonListWithIcon list={addNewsListItem} />
            </div>
            <CommonDraggableTable rows={row} columns={head} />

            {open && <AddYearGroupModal open={open} setOpen={() => setOpen(false)} updateValues={updateValues} />}
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(false)}
                    loading={deleteStaticLoading}
                    onConfirm={() => {
                        deleteStaticYearGroupMutation({ variables: { id: willDeleteItemId } })
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

export default YearGroups;
