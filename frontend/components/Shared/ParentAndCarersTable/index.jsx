import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { useMediaQuery, useTheme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { PupilParentStatus, UserStatus } from 'lwp-shared';
import moment from 'moment';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { inviteParentOfPupil, removeParentFromPupil } from '../../../graphQl/mutations';
import {
    getClassPupilsForClassPupilsPage,
    getPupilForParentsAndCarersTableForParent,
    getPupilForParentsAndCarersTableForTeacher,
    getPupilForTeacher
} from '../../../graphQl/queries';
import { getStatusInfo, GRAY, GREEN, RED, YELLOW } from '../../../lib/statuses/pupilParentStatus';
import { ADMIN, PARENT, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonCheckBox from '../CommonCheckBox';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonLoading from '../CommonLoading';
import DialogWrapper from '../DialogWrapper';
import AddParent from '../Modals/AddParent';
import ConfirmParentModal from '../Modals/ConfirmParent';
import TransferPupilToNewParent from '../Modals/TransferPupilToNewParent';
import Heading2 from '../Typography/Heading2';
import Paragraph from '../Typography/Paragraph';
import UpdateNonActiveParentDetails from './../Modals/UpdateNonActiveParentDetails';
import ParentsAndCarersForParent from './ParentsAndCarersForParent';
import TableForTeacherAndAdmin from './TableForTeacherAndAdmin';

// Mutations

const sendPupilParentInvitaionForParentAndCarersTable = gql`
    mutation sendPupilParentInvitationImmediate($pupilParentIds: [String!]!) {
        sendPupilParentInvitationImmediate(pupilParentIds: $pupilParentIds)
    }
`;

const sendParentNotificationForParentAndCarersTable = gql`
    mutation sendParentNotification($parentId: String!, $pupilId: String!, $sendOnPhone: Boolean) {
        sendParentNotification(parentId: $parentId, pupilId: $pupilId, sendOnPhone: $sendOnPhone)
    }
`;

const useStyles = makeStyles({
    mar: {
        margin: '0px !important'
    }
});

const ParentAndCarersTable = ({ child_id, viewType }) => {
    const classes = useStyles();
    const query = useParams();
    const theme = useTheme();
    // The parent view shows the cards in a narrow column, where "Add a parent"
    // crowds the heading. The teacher and admin views keep the full label.
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [showAddParentModal, setShowAddParentModal] = useState(false);
    const [open, setOpen] = useState(false);
    const [openSignupLinkModal, setOpenSignupLinkModal] = useState(false);
    const [openReminderModal, setOpenReminderModal] = useState(false);
    const [openConfirmDetailModal, setConfirmDetailModal] = useState(false);
    const [confirmParentDetailsInput, setConfirmParentDetailsInput] = useState({});
    const [inviteModal, setInviteModal] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [selectedParent, setSelectedParent] = useState({});
    const [parentToUpdate, setParentToUpdate] = useState({ open: false, parent: null, onUpdate: () => {} });
    const [parentToDetach, setParentToDetach] = useState({ open: false, parent: null });
    const [parentWillInvite, setParentWillInvite] = useState({});
    const [showInviteWarning, setShowInviteWarning] = useState();
    const [showAwaitingInviteWarning, setShowAwaitingWarning] = useState(false);
    const { callSnackbar, setChildDetails } = useContext(ThemeContext);

    const [getPupilForParentsAndCarersTableQuery, { error: pupilError, data: pupil, loading: loadingParentsAndCarersTable }] = useLazyQuery(
        viewType === PARENT ? getPupilForParentsAndCarersTableForParent : getPupilForParentsAndCarersTableForTeacher,
        {
            fetchPolicy: 'network-only'
        }
    );

    useEffect(() => pupil && setChildDetails({ id: pupil?.pupil?.id, firstname: pupil?.pupil?.firstname }), [pupil]);

    const [removeParentFromPupilMutation, { loading, error: error }] = useMutation(removeParentFromPupil, {
        refetchQueries: [
            { query: getPupilForTeacher, variables: { id: child_id } },
            ...(query?.class_id ? [{ query: getClassPupilsForClassPupilsPage, variables: { id: query.class_id } }] : [])
        ],
        awaitRefetchQueries: true
    });

    const [sendPupilParentInvitaionMutation, { loading: sendPupilParentInvitaionLoading, error: sendPupilParentInvitaionError }] =
        useMutation(sendPupilParentInvitaionForParentAndCarersTable, {
            refetchQueries: [
                { query: getPupilForTeacher, variables: { id: child_id } },
                ...(query?.class_id ? [{ query: getClassPupilsForClassPupilsPage, variables: { id: query.class_id } }] : []),
                {
                    query: viewType === PARENT ? getPupilForParentsAndCarersTableForParent : getPupilForParentsAndCarersTableForTeacher,
                    variables: { id: child_id }
                }
            ],
            awaitRefetchQueries: true
        });

    const [sendParentNotificationMutation, { loading: sendParentNotificationLoading, error: sendParentNotificationError }] = useMutation(
        sendParentNotificationForParentAndCarersTable,
        {
            refetchQueries: [
                { query: getPupilForTeacher, variables: { id: child_id } },
                ...(query?.class_id ? [{ query: getClassPupilsForClassPupilsPage, variables: { id: query.class_id } }] : [])
            ],
            awaitRefetchQueries: true
        }
    );
    const [inviteParentOfPupilMutation, { loading: invitationLoading, error: invitationError }] = useMutation(inviteParentOfPupil, {
        refetchQueries: [
            { query: getPupilForTeacher, variables: { id: child_id } },
            ...(query?.class_id ? [{ query: getClassPupilsForClassPupilsPage, variables: { id: query.class_id } }] : [])
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        child_id &&
            getPupilForParentsAndCarersTableQuery({
                variables: { id: child_id }
            });
    }, [child_id]);

    useEffect(() => {
        error?.messages && callSnackbar(error, 'error');
        invitationError?.messages && callSnackbar(invitationError, 'error');
        pupilError?.messages && callSnackbar(pupilError, 'error');
        sendParentNotificationError?.messages && callSnackbar(sendParentNotificationError, 'error');
        sendPupilParentInvitaionError?.messages && callSnackbar(sendPupilParentInvitaionError, 'error');
    }, [error, invitationError, pupilError, sendParentNotificationError, sendPupilParentInvitaionError]);

    const list = [
        {
            text: viewType === PARENT && isMobile ? 'Add' : 'Add a parent',
            icon: 'add',
            iconRight: true,
            dataTest: 'parents-carer-table-add-parent-button',
            bold: true,
            onClick: () => setShowAddParentModal(true)
        }
    ];

    const removeParent = () => {
        removeParentFromPupilMutation({ variables: { parentId: selectedParent?.id, pupilId: child_id } })
            .then(() => {
                callSnackbar('Remove parent', 'success');
                setSelectedParent({});
                setOpen(false);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const inviteParent = (parentId) => {
        inviteParentOfPupilMutation({ variables: { parentId: parentId, pupilId: child_id, sendOnPhone: isChecked } })
            .then(() => {
                callSnackbar('Invite sent', 'success');
                setParentWillInvite({});
                setInviteModal(false);
                setShowInviteWarning(false);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const removeParentConfirmation = (parent) => {
        setSelectedParent(parent);
        setOpen(true);
    };

    const confirmParentDetailConfirmation = (parent) => {
        setConfirmParentDetailsInput({
            id: parent?.id,
            firstname: parent?.firstname,
            lastname: parent?.lastname,
            email: parent?.email,
            phoneNumber: parent?.phoneNumber,
            pupilParentId: parent?.pupilParentId,
            pupilParentStatus: parent?.pupilParentStatus,
            userStatus: parent?.userStatus,
            schoolId: pupil?.pupil?.school?.id,
            numSchoolsWithPupils: parent?.numSchoolsWithPupils
        });
        setConfirmDetailModal(true);
    };

    const getOptions = (parentStatus, pupilParentStatus, pupilParentId, lastInvitationEmailSent = null, numSchoolsWithPupils = 0) => {
        const options = [];
        const pupilParentStatusColour = getStatusInfo(parentStatus, pupilParentStatus).colour;

        if (pupilParentStatusColour === GREEN && numSchoolsWithPupils > 1) {
            // Detach parent from this pupil and create a new one
            options.push({
                name: 'Edit parent',
                icon: <span style={{ color: '#00303C' }}>edit</span>,
                onClick: (parent) => setParentToDetach({ open: true, parent: { ...parent, pupilParentId } })
            });
        }

        if (pupilParentStatusColour === YELLOW) {
            options.push({
                name: 'Edit parent',
                icon: <span style={{ color: '#00303C' }}>edit</span>,
                onClick: (parent) =>
                    numSchoolsWithPupils > 1
                        ? setParentToDetach({ open: true, parent: { ...parent, pupilParentId } })
                        : setParentToUpdate({ open: true, parent, onUpdate: () => {} })
            });

            if (lastInvitationEmailSent) {
                options.push({
                    name: 'Send a reminder',
                    icon: 'notifications',
                    onClick: (parent) => {
                        setSelectedParent({ ...parent, lastInvitationEmailSent });
                        setOpenReminderModal(!openReminderModal);
                    }
                });
            }

            if (!lastInvitationEmailSent && pupil?.pupil?.isCurrentYearTopicsReleased) {
                options.unshift({
                    name: 'Send invitations immediately',
                    icon: <span style={{ color: '#00303C' }}>mail</span>,
                    onClick: () => setShowAwaitingWarning(pupilParentId)
                });
            }
        }

        if (pupilParentStatusColour === RED) {
            if (pupilParentStatus === PupilParentStatus.REJECTED || parentStatus === UserStatus.REJECTED) {
                options.push({
                    name: 'Reconfirm details',
                    icon: <span style={{ color: '#00303C' }}>how_to_reg</span>,
                    onClick: (parent) => confirmParentDetailConfirmation({ ...parent, pupilParentStatus, pupilParentId })
                });
            }
        }

        if (pupilParentStatusColour === GRAY) {
            options.push({
                name: 'Confirm details',
                icon: <span style={{ color: '#00303C' }}>how_to_reg</span>,
                onClick: (parent) => confirmParentDetailConfirmation({ ...parent, pupilParentStatus, pupilParentId })
            });

            if (numSchoolsWithPupils > 1) {
                options.push({
                    name: 'Edit parent',
                    icon: <span style={{ color: '#00303C' }}>edit</span>,
                    onClick: (parent) => setParentToDetach({ open: true, parent: { ...parent, pupilParentId } })
                });
            }
        }

        options.push({
            name: <span style={{ color: '#E8492A' }}>Remove parent</span>,
            icon: <span style={{ color: '#E8492A' }}>delete</span>,
            onClick: (parent) => removeParentConfirmation(parent)
        });

        return options;
    };

    // Only the teacher and admin views still render a table, so only they need column headings.
    const heading = ['Parent name', 'Contact details', 'Status', ''];

    if (loadingParentsAndCarersTable) return <CommonLoading />;

    return (
        <div className="parents_carers_table_container mt16">
            <div className={`header ${classes.alignment}`}>
                <Heading2 customClass={`${classes.mar} parents_carers_text`} text="Parents/carers" />
                <CommonListWithIcon list={list} />
            </div>

            <div className="parent-table">
                {viewType === PARENT ? (
                    <ParentsAndCarersForParent pupil={pupil} />
                ) : viewType === TEACHER || viewType === ADMIN ? (
                    <TableForTeacherAndAdmin
                        heading={heading}
                        pupil={pupil}
                        getOptions={getOptions}
                        removeParentConfirmation={removeParentConfirmation}
                        viewType={viewType}
                    />
                ) : (
                    ''
                )}
            </div>

            {showAddParentModal && (
                <AddParent open={showAddParentModal} setOpen={setShowAddParentModal} child_id={child_id} viewType={viewType} />
            )}
            {showAwaitingInviteWarning && (
                <DialogWrapper
                    open={showAwaitingInviteWarning}
                    setOpen={() => setShowAwaitingWarning(false)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={() => {
                        sendPupilParentInvitaionMutation({
                            variables: {
                                pupilParentIds: [showAwaitingInviteWarning]
                            }
                        })
                            .then(() => {
                                callSnackbar('Invitation sent', 'success');
                                setShowAwaitingWarning(false);
                            })
                            .catch(({ ...err }) => callSnackbar(err, 'error'));
                    }}
                    primaryBtnloading={sendPupilParentInvitaionLoading}
                    primaryBtnText="Send now"
                    heading="Send invitation immediately"
                    contentWidth="550px">
                    <Paragraph customClass="pt2 pb5">
                        Invitations are usually sent to parents automatically near the end of the school day so they are at the top of
                        parents’ inboxes. If you wish to send it now instead please confirm below.
                    </Paragraph>
                </DialogWrapper>
            )}
            {open && (
                <DialogWrapper
                    open={open}
                    setOpen={() => setOpen(!open)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={removeParent}
                    primaryBtnloading={loading}
                    primaryBtnText="Remove parent"
                    heading="Remove this parent?"
                    contentWidth="550px">
                    <Paragraph customClass="pt2 pb5">
                        If you remove this account, {selectedParent.firstname} {selectedParent.lastname} will no longer have access to this
                        pupil’s account. We will also stop sending emails for this pupil to them. Are you sure you want to remove this
                        parent?
                    </Paragraph>
                </DialogWrapper>
            )}
            {openReminderModal && (
                <DialogWrapper
                    open={openReminderModal}
                    setOpen={() => setOpenReminderModal(!openReminderModal)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={() => {
                        sendParentNotificationMutation({
                            variables: {
                                parentId: selectedParent?.id,
                                pupilId: child_id,
                                sendOnPhone:
                                    isChecked && selectedParent?.phoneNumber
                                        ? true
                                        : !selectedParent?.email && selectedParent?.phoneNumber
                                          ? true
                                          : false
                            }
                        })
                            .then(() => {
                                callSnackbar('Reminder sent', 'success');
                                setSelectedParent({});
                                setOpenReminderModal(!openReminderModal);
                            })
                            .catch(({ ...err }) => callSnackbar(err, 'error'));
                    }}
                    primaryBtnloading={sendParentNotificationLoading}
                    primaryBtnText="Send reminder"
                    heading="Send a reminder"
                    contentWidth="550px">
                    <Paragraph customClass="pt2 pb5">
                        This pupil&apos;s parent is receiving notifications for topics but hasn&apos;t accessed the site yet.
                        <br /> <br />
                        {selectedParent?.lastInvitationEmailSent ? (
                            <>
                                They were last contacted {moment(selectedParent?.lastInvitationEmailSent).fromNow()}.
                                <br /> <br />
                            </>
                        ) : null}
                        Sending a reminder would provide them with a link to access the site. <br />
                        {selectedParent?.email && selectedParent.phoneNumber && (
                            <CommonCheckBox
                                className="mt6"
                                checked={isChecked}
                                onChange={() => setIsChecked(!isChecked)}
                                disabled={invitationLoading}>
                                Also send a link to their registered phone number: <b>{selectedParent.phoneNumber}</b>
                            </CommonCheckBox>
                        )}
                    </Paragraph>
                </DialogWrapper>
            )}
            {openConfirmDetailModal && (
                <ConfirmParentModal
                    refetch={[
                        { query: getPupilForTeacher, variables: { id: child_id } },
                        ...(query?.class_id ? [{ query: getClassPupilsForClassPupilsPage, variables: { id: query.class_id } }] : []),
                        {
                            query:
                                viewType === PARENT
                                    ? getPupilForParentsAndCarersTableForParent
                                    : getPupilForParentsAndCarersTableForTeacher,
                            variables: { id: child_id }
                        }
                    ]}
                    open={openConfirmDetailModal}
                    setOpen={() => setConfirmDetailModal(false)}
                    onConfirm={() => {
                        setConfirmParentDetailsInput({});
                        setConfirmDetailModal(!openConfirmDetailModal);
                    }}
                    onEdit={(editInput) => {
                        setConfirmParentDetailsInput({});
                        setConfirmDetailModal(false);
                        if (editInput.numSchoolsWithPupils > 1) {
                            setParentToDetach({
                                open: true,
                                parent: {
                                    id: editInput.id,
                                    firstname: editInput.firstname,
                                    lastname: editInput.lastname,
                                    email: editInput?.email,
                                    phoneNumber: editInput?.phoneNumber,
                                    userStatus: editInput.userStatus,
                                    pupilParentId: editInput.pupilParentId
                                }
                            });
                        } else {
                            setParentToUpdate({
                                open: true,
                                parent: {
                                    id: editInput.id,
                                    firstname: editInput.firstname,
                                    lastname: editInput.lastname,
                                    email: editInput?.email,
                                    phoneNumber: editInput?.phoneNumber,
                                    userStatus: editInput.userStatus
                                },
                                onUpdate: (updateInput) => {
                                    setConfirmParentDetailsInput({
                                        id: updateInput?.id,
                                        firstname: updateInput?.firstname,
                                        lastname: updateInput?.lastname,
                                        email: updateInput?.email,
                                        phoneNumber: updateInput?.phoneNumber,
                                        userStatus: updateInput?.userStatus,
                                        pupilParentId: editInput?.pupilParentId,
                                        numSchoolsWithPupils: editInput.numSchoolsWithPupils,
                                        pupilParentStatus: editInput?.pupilParentStatus,
                                        schoolId: pupil?.pupil?.school?.id
                                    });
                                    setConfirmDetailModal(true);
                                }
                            });
                        }
                    }}
                    input={confirmParentDetailsInput}
                />
            )}
            {inviteModal && (
                <DialogWrapper
                    open={inviteModal}
                    setOpen={() => {
                        setInviteModal(!inviteModal);
                        setShowInviteWarning(false);
                    }}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={() => inviteParent(parentWillInvite.id)}
                    primaryBtnloading={invitationLoading}
                    primaryBtnText="Send invite"
                    heading="Invite this parent?"
                    contentWidth="550px">
                    {showInviteWarning && (
                        <Paragraph customClass="pt2 pb5">
                            This user rejected a previous invitation. Please make sure the contact details are correct before you proceed.
                        </Paragraph>
                    )}
                    {parentWillInvite?.email && (
                        <div className="invite-parent-modal">
                            <Paragraph customClass="pt2 pb5">
                                We will send an invitation link to this parent’s email address: <b>{parentWillInvite.email}</b>.
                            </Paragraph>
                        </div>
                    )}
                    {parentWillInvite?.phoneNumber && (
                        <CommonCheckBox
                            className="pt2 pb5"
                            checked={isChecked}
                            // checked={false}
                            onChange={() => setIsChecked(!isChecked)}
                            disabled={invitationLoading}>
                            Also send an invitation link to their registered phone number: <b>{parentWillInvite.phoneNumber}</b>
                        </CommonCheckBox>
                    )}
                </DialogWrapper>
            )}
            {parentToUpdate.open && (
                <UpdateNonActiveParentDetails
                    open={parentToUpdate.open}
                    setOpen={() => setParentToUpdate({ open: false, parent: null })}
                    pupilId={child_id}
                    parent={parentToUpdate.parent}
                    onUpdate={parentToUpdate.onUpdate}
                />
            )}
            {parentToDetach.open && (
                <TransferPupilToNewParent
                    open={parentToDetach.open}
                    setOpen={() => setParentToDetach({ open: false, parent: null })}
                    pupilId={child_id}
                    parent={parentToDetach.parent}
                />
            )}
            {openSignupLinkModal && (
                <DialogWrapper
                    open={openSignupLinkModal}
                    setOpen={() => setOpenSignupLinkModal(!openSignupLinkModal)}
                    dialogFooter
                    secondaryBtnHandler={() => {
                        getPupilForParentsAndCarersTableQuery({ variables: { id: child_id } });
                        setOpenSignupLinkModal(!openSignupLinkModal);
                    }}
                    primaryBtnHandler={removeParent}
                    secondaryBtnloading={loading}
                    secondaryBtn="Close"
                    heading="Signup Link"
                    contentWidth="550px">
                    <Paragraph customClass="pt2 pb5">
                        Please find the signup link for{' '}
                        <strong>
                            {' '}
                            {selectedParent.firstname} {selectedParent.lastname}{' '}
                        </strong>{' '}
                        below. You can copy and send this to the parent, or click on the link to open a new window with the signup form and
                        hand the device to the parent to sign up.
                    </Paragraph>
                    <div className="invited_parent_signup_link">
                        <Paragraph text="Sign up link:" />
                        <span
                            onClick={() => {
                                window.open(
                                    `${location.protocol}//${location.host}/signup/${selectedParent.resetPassToken}`,
                                    '_blank',
                                    `width=${window.innerWidth}, height=${window.innerHeight}`
                                );
                            }}>
                            {`${location.protocol}//${location.host}/signup/${selectedParent.resetPassToken}`}
                        </span>
                    </div>
                </DialogWrapper>
            )}
        </div>
    );
};

ParentAndCarersTable.propTypes = {
    child_id: PropTypes.string,
    onClick: PropTypes.func,
    viewType: PropTypes.string
};

export default ParentAndCarersTable;
