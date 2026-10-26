import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useState } from 'react';

import { deleteUser } from '../../../graphQl/mutations';
import { getAdmins } from '../../../graphQl/queries';
import { showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../../components/Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../../components/Shared/CommonDraggableTable';
import CommonListWithIcon from './../../../components/Shared/CommonListWithIcon';
import CommonLoading from './../../../components/Shared/CommonLoading';
import ConfirmationModal from './../../../components/Shared/Modals/ConfirmationModal';
import Heading2 from './../../../components/Shared/Typography/Heading2';
import Paragraph from './../../../components/Shared/Typography/Paragraph';
import AddAdminModal from './../../Shared/Modals/AddAdmin';

const AdminsOverviewAdmin = () => {
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);
    const [openDeleteAdmin, setOpenDeleteAdmin] = useState(false);
    const [adminToBeDeletedId, setAdminToBeDeletedId] = useState(null);
    const { callSnackbar } = useContext(ThemeContext);

    const [getAdminsQuery, { loading, error, data: admins }] = useLazyQuery(getAdmins, { fetchPolicy: 'network-only' });
    const [deleteUserMutation, { loading: deleteUserLoading }] = useMutation(deleteUser, {
        refetchQueries: [{ query: getAdmins }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _onClick = (id) => {
        setOpenDeleteAdmin(true);
        setAdminToBeDeletedId(id);
    };

    useEffect(() => {
        getAdminsQuery();
    }, []);

    const list = [
        {
            text: 'Add an admin',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpen(!open)
        }
    ];

    const head = [
        {
            accessor: 'col1',
            Header: 'Admin name'
        },
        {
            accessor: 'col2',
            Header: 'Contact'
        },
        {
            accessor: 'col3',
            Header: 'Status'
        },
        {
            accessor: 'col4',
            Header: 'Last Access',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col4, b.original?.col4)
        },
        {
            accessor: 'col5',
            Header: 'Type'
        },
        {
            accessor: 'col6',
            Header: ''
        }
    ];

    const Row = (admins?.getAdmins || []).map((admin) => {
        return {
            id: admin?.id,
            col1: `${admin.firstname} ${admin.lastname}`,
            col2: admin.email,
            col3: admin.userStatus,
            col4: admin.lastAccess,
            col5: admin.type,
            col6: (
                <>
                    <CommonIconButton toolTipTitle="Edit" onClick={() => router?.push(`${router?.asPath}/${admin.id}`)} icon="create" />
                    <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(admin.id)} icon={'delete'} />
                </>
            )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="admins_overview" data-test={'site-admins-page'}>
            <div className="header">
                <Heading2 text="Admins" />
                <CommonListWithIcon list={list} />
            </div>
            <div className="admin-filter-button">
                <Button className="filter-button" onClick={() => setOpenFilter(!openFilter)}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {openFilter ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>

            <CommonDraggableTable rows={Row} columns={head} />

            <AddAdminModal open={open} setOpen={setOpen} />
            {openDeleteAdmin && (
                <ConfirmationModal
                    open={openDeleteAdmin}
                    onCancel={() => setOpenDeleteAdmin(!openDeleteAdmin)}
                    loading={deleteUserLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteUserMutation({
                            variables: {
                                id: adminToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteAdmin(!openDeleteAdmin);
                                setAdminToBeDeletedId(null);
                                callSnackbar('Admin deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteAdmin(!openDeleteAdmin);
                                setAdminToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the admin." />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default AdminsOverviewAdmin;
