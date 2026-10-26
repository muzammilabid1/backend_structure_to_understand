import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteUser } from '../../../graphQl/mutations';
import { getSchoolsAwaitingWelcome, getSchoolTeachersForAdmin } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { capitalizeFirstLetter, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonListWithIcon from './../../Shared/CommonListWithIcon';
import CommonLoading from './../../Shared/CommonLoading';
import CommonTooltipIcon from './../../Shared/CommonTooltipIcon';
import AddTeacherModal from './../../Shared/Modals/AddTeacher';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import SendInvitesModal from './../../Shared/Modals/SendInvites';
import SendWelcomeEmailsModal from './../../Shared/Modals/SendWelcomeEmailsModal';
import Paragraph from './../../Shared/Typography/Paragraph';

const StaffOverview = ({ school_id }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [open, setOpen] = useState(false);
    const [openFilter, setOpenFilter] = useState(false);
    const [openDeleteUser, setOpenDeleteUser] = useState(false);
    const [userToBeDeletedId, setUserToBeDeletedId] = useState(null);
    const [openSendInvites, setOpenSendInvites] = useState(false);
    const [openSendWelcomeEmails, setOpenSendWelcomeEmails] = useState(false);

    const [getSchoolTeachersQuery, { loading, error, data: teachers }] = useLazyQuery(getSchoolTeachersForAdmin, {
        fetchPolicy: 'network-only'
    });

    const [getSchoolsAwaitingWelcomeQuery, { data: schoolsAwaitingWelcomeData, loading: schoolsAwaitingWelcomeLoading }] = useLazyQuery(
        getSchoolsAwaitingWelcome,
        { fetchPolicy: 'network-only' }
    );

    const refetchAwaitingWelcome = () => getSchoolsAwaitingWelcomeQuery({ variables: { schoolIds: [school_id] } });

    // Whenever the staff list reloads (a teacher added, deleted or invited), who is owed the welcome email may have
    // changed with it.
    useEffect(() => {
        if (teachers) refetchAwaitingWelcome();
    }, [teachers]);

    const [deleteUserMutation, { loading: deleteUserLoading }] = useMutation(deleteUser, {
        refetchQueries: [
            {
                query: getSchoolTeachersForAdmin,
                variables: { schoolId: school_id }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _onClick = (id) => {
        setOpenDeleteUser(true);
        setUserToBeDeletedId(id);
    };

    useEffect(() => {
        getSchoolTeachersQuery({ variables: { schoolId: school_id } });
    }, []);

    const addNewsListItem = [
        {
            text: 'Add a teacher',
            icon: 'add',
            iconRight: true,
            bold: true,
            onClick: () => setOpen(!open)
        }
    ];

    const head = [
        {
            Header: 'Name',
            accessor: '',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/teacher/${params?.row?.original?.id}`}>
                    <Paragraph dataTest="school-staff-overview-teacher-name" customClass="arrow_cursor">
                        {params?.row?.original?.col1}
                    </Paragraph>
                </Link>
            )
        },
        {
            Header: 'Email',
            accessor: 'col2'
        },
        {
            Header: 'Status',
            accessor: 'col3'
        },
        {
            Header: 'Role',
            accessor: 'col4'
        },
        {
            Header: 'Last Access',
            accessor: 'col5',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col5, b.original?.col5)
        },
        {
            Header: '',
            accessor: 'col6'
        }
    ];

    const uninvitedStaff = (teachers?.getSchoolTeachersForAdmin || []).filter((teacher) => teacher?.userStatus === 'IMPORTED');

    const schoolsAwaitingWelcome = schoolsAwaitingWelcomeData?.getSchoolsAwaitingWelcome || [];

    const invitees = uninvitedStaff.map((teacher) => ({
        userId: teacher.id,
        firstname: teacher.firstname,
        lastname: teacher.lastname,
        isSchoolLeader: teacher.isSchoolLeader,
        inviteMode: teacher.inviteMode
    }));

    const row = (teachers?.getSchoolTeachersForAdmin || []).map((teacher) => {
        return {
            id: teacher.id,
            col1: (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    {teacher?.firstname} {teacher?.lastname}
                    {teacher?.userStatus === 'IMPORTED' && (
                        <CommonTooltipIcon
                            icon="error_outline"
                            customIconClass="uninvited-staff-icon"
                            text={
                                teacher?.isSchoolLeader ? 'This school leader has not been invited.' : 'This teacher has not been invited.'
                            }
                            dataTest={`staff-uninvited-icon-${teacher?.id}`}
                        />
                    )}
                </span>
            ),
            col2: teacher?.email,
            col3: capitalizeFirstLetter(teacher?.userStatus),
            col4: teacher?.isSchoolLeader ? capitalizeFirstLetter('LEADER') : capitalizeFirstLetter('TEACHER'),
            col5: teacher?.lastAccess,
            col6: <CommonIconButton toolTipTitle={'Delete'} onClick={() => _onClick(teacher.id)} icon={'delete'} />
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="classes_overview">
            <div className="btn_group staff-overview-header">
                <div>
                    <CommonListWithIcon list={addNewsListItem} />
                </div>
                <div className="user-filter-button">
                    {uninvitedStaff.length > 0 && (
                        <LWPButton
                            btnText="Send invites"
                            endIcon="mail"
                            onClick={() => setOpenSendInvites(true)}
                            dataTest="staff-send-invites-button"
                        />
                    )}
                    {schoolsAwaitingWelcome.length > 0 && (
                        <LWPButton
                            btnText="Send welcome emails"
                            endIcon="mail"
                            onClick={() => setOpenSendWelcomeEmails(true)}
                            dataTest="staff-send-welcome-emails-button"
                        />
                    )}
                    <Button className="filter-button" onClick={() => setOpenFilter(!openFilter)}>
                        Filter
                        <Typography>
                            <span style={{ color: 'black' }} className={`material-icons filter-icon`}>
                                {openFilter ? 'expand_less' : 'expand_more'}
                            </span>
                        </Typography>
                    </Button>
                </div>
            </div>

            <CommonDraggableTable rows={row} columns={head} />
            {open && (
                <AddTeacherModal
                    open={open}
                    setOpen={() => setOpen(!open)}
                    schoolId={school_id}
                    isAdmin
                    refetchQueries={{
                        query: getSchoolTeachersForAdmin,
                        variables: { schoolId: school_id }
                    }}
                />
            )}
            {openSendInvites && (
                <SendInvitesModal
                    open={openSendInvites}
                    setOpen={setOpenSendInvites}
                    invitees={invitees}
                    subtitle="Everyone ticked below will be sent an invite for this school. Anyone marked as do not invite starts unticked."
                    onSent={() => getSchoolTeachersQuery({ variables: { schoolId: school_id } })}
                />
            )}
            {openSendWelcomeEmails && (
                <SendWelcomeEmailsModal
                    open={openSendWelcomeEmails}
                    setOpen={setOpenSendWelcomeEmails}
                    schools={schoolsAwaitingWelcome}
                    loading={schoolsAwaitingWelcomeLoading}
                    onSent={refetchAwaitingWelcome}
                />
            )}
            {openDeleteUser && (
                <ConfirmationModal
                    open={openDeleteUser}
                    onCancel={() => setOpenDeleteUser(!openDeleteUser)}
                    loading={deleteUserLoading}
                    heading="Are you sure?"
                    btnText="Confirm"
                    onConfirm={() => {
                        deleteUserMutation({
                            variables: {
                                id: userToBeDeletedId
                            }
                        })
                            .then(() => {
                                setOpenDeleteUser(!openDeleteUser);
                                setUserToBeDeletedId(null);
                                callSnackbar('User deleted!', 'success');
                            })
                            .catch(({ ...err }) => {
                                setOpenDeleteUser(!openDeleteUser);
                                setUserToBeDeletedId(null);
                                callSnackbar(err, 'error');
                            });
                    }}>
                    <Paragraph text="This will permanently delete the staff." />
                </ConfirmationModal>
            )}
        </div>
    );
};

StaffOverview.propTypes = { school_id: PropTypes.string };

export default StaffOverview;
