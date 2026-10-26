import { useMutation, useQuery } from '@apollo/client';
import React, { useContext, useEffect, useState } from 'react';

import { deleteAdminQuery } from '../../../graphQl/mutations';
import { allAdminQueries } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import AddQueryModal from './../../Shared/Modals/AddQueryModal';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Heading2 from './../../Shared/Typography/Heading2';
import Paragraph from './../../Shared/Typography/Paragraph';

const AdminDataSQL = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [openDeleteQuery, setOpenDeleteQuery] = useState(false);
    const [queryToBeDeletedId, setQueryToBeDeletedId] = useState(null);
    const [updatedValues, setUpdatedValues] = useState(null);

    const { loading: adminQueriesLoading, error: error, data: adminQueries } = useQuery(allAdminQueries);

    const [deleteAdminQueryMutation, { loading: deleteQueryLoading }] = useMutation(deleteAdminQuery, {
        refetchQueries: [{ query: allAdminQueries }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const addQueryListItem = [
        {
            text: 'Add a Query',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpen(!open)
        }
    ];

    const _onClick = (id) => {
        setUpdatedValues((adminQueries?.allAdminQueries || []).find((query) => query?.id === id));
        setOpen(true);
    };

    const _onDelete = (id) => {
        setOpenDeleteQuery(true);
        setQueryToBeDeletedId(id);
    };

    const heading = ['Query Name', 'Order', ''];

    const head = heading.map((head, index) => {
        return { accessor: `col${index + 1}`, Header: head };
    });

    const row = (adminQueries?.allAdminQueries || []).map((adminQuery) => {
        return {
            id: adminQuery?.id,
            col1: adminQuery?.name,
            col2: adminQuery?.order,
            col3: (
                <>
                    <CommonIconButton toolTipTitle={'Edit'} onClick={() => _onClick(adminQuery?.id)} icon={'edit'} />
                    <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onDelete(adminQuery?.id)} icon={'delete'} />
                </>
            )
        };
    });

    if (adminQueriesLoading) return <CommonLoading />;

    return (
        <div className="schools_overview">
            <div className="header">
                <Heading2 text="Admin Data SQL" />
                <CommonListWithIcon list={addQueryListItem} />
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            <AddQueryModal open={open} setOpen={setOpen} updatedValues={updatedValues} setUpdatedValues={setUpdatedValues} />
            {openDeleteQuery && (
                <ConfirmationModal
                    open={openDeleteQuery}
                    onCancel={() => setOpenDeleteQuery(!openDeleteQuery)}
                    loading={deleteQueryLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteAdminQueryMutation({
                            variables: {
                                id: queryToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteQuery(!openDeleteQuery);
                                setQueryToBeDeletedId(null);
                                callSnackbar('Query deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteQuery(!openDeleteQuery);
                                setQueryToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will delete the query." />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default AdminDataSQL;
