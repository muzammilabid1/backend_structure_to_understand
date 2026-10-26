/* eslint-disable react/display-name */
import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { deleteUser } from '../../../graphQl/mutations';
import { getPupilParents } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { PARENT_LAST_INVITATION_SENT_UNKNOWN_DATE_SENTINEL } from '../../../shared/horrible-assumptions';
import { capitalizeFirstLetter, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';

const ParentDetailsAdmin = () => {
    const queryParams = useParams();
    const router = useRouter();

    const { callSnackbar } = useContext(ThemeContext);
    const [isOpen, setIsOpen] = useState(false);
    const [openDeleteParent, setOpenDeleteParent] = useState(false);
    const [parentToBeDeletedId, setParentToBeDeletedId] = useState(null);

    const [getPupilParentsQuery, { loading, error, data: parents }] = useLazyQuery(getPupilParents, {
        fetchPolicy: 'network-only'
    });

    const [deleteUserMutation, { loading: deleteUserLoading }] = useMutation(deleteUser, {
        refetchQueries: [{ query: getPupilParents, variables: { pupilId: queryParams?.child_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        queryParams?.child_id &&
            getPupilParentsQuery({
                variables: { pupilId: queryParams?.child_id }
            });
    }, []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    // const isItemDeleted = (id) => {
    //     const classTopic = (parents?.getPupilParents || []).find((s) => s.id === id);

    //     return classTopic?.deletedAt ? true : false;
    // };

    // const _onClick = (isItemDeleted, id) => {
    //     if (isItemDeleted) {
    //         setOpenRestoreParent(true);
    //         setParentToBeRestoredId(id);
    //     } else {
    //         setOpenDeleteParent(true);
    //         setParentToBeDeletedId(id);
    //     }
    // };

    let heading = [
        'Name',
        'Email',
        'Phone Number',
        'Link Status',
        'User Status',
        'Last Access',
        'Last Link Status Change',
        'Last Invitation Email Sent',
        ''
    ];

    let head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Name') {
            rowHead.Cell = (params) => (
                <Link passHref href={`${adminPath}/parent/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            );
        }

        if (head === 'Last Access') {
            rowHead.Cell = ({ value }) => (value ? showDate({ date: value, time: true }) : '-');
            rowHead.sortType = (a, b) => sortingDate(a.original?.col6, b.original?.col6);
        }

        if (head === 'Last Link Status Change') {
            rowHead.Cell = ({ value }) => (value ? showDate({ date: value, time: true }) : '-');
            rowHead.sortType = (a, b) => sortingDate(a.original?.col7, b.original?.col7);
        }

        if (head === 'Last Invitation Email Sent') {
            rowHead.Cell = ({ value }) =>
                value ? showDate({ date: value, time: true, unknownDateSentinel: PARENT_LAST_INVITATION_SENT_UNKNOWN_DATE_SENTINEL }) : '-';
            rowHead.sortType = (a, b) => sortingDate(a.original?.col8, b.original?.col8);
        }

        return rowHead;
    });

    const row = (parents?.getPupilParents || []).map((parent) => {
        return {
            id: parent?.parent?.id,
            col1: `${parent?.parent?.firstname} ${parent?.parent?.lastname}`,
            col2: parent?.parent?.email,
            col3: parent?.parent?.phoneNumber ?? '-',
            col4: capitalizeFirstLetter(parent?.status),
            col5: capitalizeFirstLetter(parent?.parent?.userStatus),
            col6: parent?.parent?.lastAccess,
            col7: parent?.logLastStatusChange,
            col8: parent?.lastInvitationEmailSent,
            col9: (
                <CommonIconButton
                    toolTipTitle="Parent view"
                    onClick={() => router?.push(`/parent/${parent?.parent?.id}`)}
                    icon="visibility"
                />
            )
            // col7: (
            //     <CommonIconButton
            //         toolTipTitle={isItemDeleted(parent.id) ? 'Restore' : 'Delete'}
            //         onClick={() => _onClick(isItemDeleted(parent.id), parent.id)}
            //         icon={isItemDeleted(parent.id) ? 'restore_from_trash' : 'delete'}
            //     />
            // )
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="admin-parents-overview">
            <div className="parent-filter-button">
                <Button className="filter-button" onClick={() => setIsOpen(!isOpen)}>
                    Filter
                    <Typography>
                        <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                            {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                    </Typography>
                </Button>
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            {openDeleteParent && (
                <ConfirmationModal
                    open={openDeleteParent}
                    onCancel={() => setOpenDeleteParent(!openDeleteParent)}
                    loading={deleteUserLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteUserMutation({
                            variables: {
                                id: parentToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteParent(!openDeleteParent);
                                setParentToBeDeletedId(null);
                                callSnackbar('Parent deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteParent(!openDeleteParent);
                                setParentToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the parent." />
                </ConfirmationModal>
            )}
        </div>
    );
};

export default ParentDetailsAdmin;
