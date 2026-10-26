import { useMutation, useQuery } from '@apollo/client';
import { TableCell, TableRow, Tooltip } from '@mui/material';
import { UserStatus } from 'lwp-shared';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { deleteTeacher, inviteTeacher } from '../../../../graphQl/mutations';
import { getSchoolTeachers } from '../../../../graphQl/queries';
import { ADMIN, MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { capitalizeFirstLetter, getUserStatusDescription, showDate, ThemeContext } from '../../../../shared/Services/handler';
import CommonBadge from './../../../Shared/CommonBadge';
import CommonLoading from './../../../Shared/CommonLoading';
import CommonStatus from './../../../Shared/CommonStatus';
import CommonTable from './../../../Shared/CommonTable';
import DialogWrapper from './../../../Shared/DialogWrapper';
import ConfirmationModal from './../../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../../Shared/Typography/Paragraph';
import { useDelegatedClaims } from '../../../../context/DelegatedClaimsContext';
const AccordionList = ({ onClick, setDefaultValues, schoolId }) => {
    const [open, setOpen] = useState(false);
    const [openError, setOpenError] = useState(false);
    const [teacherToRemove, setTeacherToRemove] = useState({ teacher: null, mainClasses: [] });
    const { callSnackbar, token } = useContext(ThemeContext);
    const { setClaims } = useDelegatedClaims();
    const {
        loading,
        error,
        data: teachers
    } = useQuery(getSchoolTeachers, {
        variables: { schoolId },
        skip: !(token?.isSchoolLeader || token?.userType === ADMIN), // Only school leaders and admins can view teachers
        fetchPolicy: 'network-only'
    });
    useEffect(() => {
        setClaims({ schoolId });
    }, [schoolId]);

    const [showInviteWarning, setShowInviteWarning] = useState({ show: false, teacherId: null });

    const [deleteTeacherMutation, { loading: deleteTeacherLoading }] = useMutation(deleteTeacher, {
        refetchQueries: [{ query: getSchoolTeachers, variables: { schoolId } }],
        awaitRefetchQueries: true
    });

    const [inviteTeacherMutation, { loading: inviteTeacherLoading }] = useMutation(inviteTeacher, {
        refetchQueries: [{ query: getSchoolTeachers, variables: { schoolId } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _onClick = (id) => {
        teachers?.getSchoolTeachers && setDefaultValues(teachers?.getSchoolTeachers.find((teacher) => teacher.id === id));
        onClick();
    };

    const _onDelete = (teacher) => {
        const mainClasses = (teacher?.mainClasses || [])?.filter(
            (mainClass) => mainClass?.period?.index === teacher?.school?.curentPeriod?.index
        );

        setTeacherToRemove({ teacher, mainClasses });
        if (mainClasses?.length > 0) {
            setOpenError(!openError);
        } else {
            setOpen(true);
        }
    };

    const _onInvite = (teacher, userStatus) => {
        if (userStatus === UserStatus.REJECTED) {
            setShowInviteWarning({ show: true, teacherId: teacher?.id });
        } else {
            inviteTeacherMutation({
                variables: { input: { teacherId: teacher?.id, schoolId } }
            })
                .then(() => {
                    callSnackbar('Invitation sent.', 'success');
                })
                .catch((err) => {
                    callSnackbar(err, 'error');
                });
        }
    };

    const confirmDeleteTeacher = () => {
        deleteTeacherMutation({
            variables: { id: teacherToRemove?.teacher?.id, schoolId }
        })
            .then(() => {
                callSnackbar('Teacher has been deleted successfully.', 'success');
                setOpen(false);
                setTeacherToRemove({ teacher: null, mainClasses: [] });
            })
            .catch((err) => {
                callSnackbar(err, 'error');
                setOpen(false);
                setTeacherToRemove({ teacher: null, mainClasses: [] });
            });
    };

    const getBadgeClass = (userStatus) => {
        if (userStatus === UserStatus.ACTIVE) {
            return 'badge_registered_color';
        } else if (userStatus === UserStatus.INVITED) {
            return 'badge_pending_color';
        } else if (userStatus === UserStatus.IMPORTED) {
            return 'badge_imported_color';
        } else if (userStatus === UserStatus.DEACTIVATED) {
            return 'badge_red_color';
        } else if (userStatus === UserStatus.REJECTED) {
            return 'badge_red_color';
        } else {
            return 'badge_imported_color';
        }
    };

    const getBadgeContent = (userStatus) => {
        if (userStatus === UserStatus.ACTIVE) {
            return 'Registered';
        } else if (userStatus === UserStatus.INVITED) {
            return 'Invited';
        } else if (userStatus === UserStatus.IMPORTED) {
            return 'Not yet invited';
        } else if (userStatus === UserStatus.DEACTIVATED) {
            return 'Deactivated';
        } else if (userStatus === UserStatus.REJECTED) {
            return 'Rejected invitation';
        } else {
            return capitalizeFirstLetter(userStatus);
        }
    };

    const getTeacherName = (teacher) => {
        if (teacher?.isSchoolLeader) {
            return (
                <div className="teacher-name-cell">
                    <span>{`${teacher?.firstname} ${teacher?.lastname} `}</span>
                    <Tooltip title={'School Leader'}>
                        <span className="material-icons">admin_panel_settings</span>
                    </Tooltip>
                </div>
            );
        }

        return `${teacher?.firstname} ${teacher?.lastname}`;
    };

    const head = ['Teacher name', 'Email', 'Alias', 'Status', 'Last login', ''];

    if (loading) return <CommonLoading />;

    return (
        <div>
            {!loading && !teachers?.getSchoolTeachers?.length ? (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'No teachers to show'}
                    subHeading={'Add a teacher to get started'}
                />
            ) : (
                <CommonTable bold head={head}>
                    {(teachers?.getSchoolTeachers || []).map((teacher) => {
                        return (
                            <TableRow key={teacher?.id} data-test={'teacher-row'}>
                                <TableCell
                                    data-test={'teacher-name'}
                                    className={teacher?.userStatus === 'DEACTIVATED' ? 'deactivated' : ''}>
                                    {getTeacherName(teacher)}
                                </TableCell>
                                <TableCell
                                    data-test={'teacher-email'}
                                    className={teacher?.userStatus === 'DEACTIVATED' ? 'deactivated' : ''}>
                                    {teacher?.email}
                                </TableCell>
                                <TableCell className={teacher?.userStatus === 'DEACTIVATED' ? 'deactivated' : ''}>
                                    {teacher?.nameForChildren}
                                </TableCell>
                                <TableCell>
                                    <Tooltip title={getUserStatusDescription(teacher?.userStatus)}>
                                        <div>
                                            <CommonBadge
                                                className={getBadgeClass(teacher?.userStatus)}
                                                badgeContent={getBadgeContent(teacher?.userStatus)}
                                            />
                                        </div>
                                    </Tooltip>
                                </TableCell>
                                <TableCell className={teacher?.userStatus === 'DEACTIVATED' ? 'deactivated' : ''}>
                                    <Tooltip
                                        title={
                                            teacher?.lastAccess ? showDate({ date: teacher?.lastAccess, time: true }) : 'Never logged in'
                                        }>
                                        <span className="teacher-last-login-container">
                                            {teacher?.lastAccess ? moment(teacher?.lastAccess).fromNow() : '-'}
                                        </span>
                                    </Tooltip>
                                </TableCell>
                                <TableCell align="right">
                                    <div className="actions-cell">
                                        {(teacher?.userStatus === UserStatus.INVITED ||
                                            teacher?.userStatus === UserStatus.IMPORTED ||
                                            teacher?.userStatus === UserStatus.REJECTED) && (
                                            <div onClick={() => _onInvite(teacher, teacher?.userStatus)}>
                                                <Tooltip title={'Invite'}>
                                                    <span className="material-icons">mail</span>
                                                </Tooltip>
                                            </div>
                                        )}
                                        {teacher?.id !== token?.sub && (
                                            <div onClick={() => _onDelete(teacher)}>
                                                <Tooltip title={'Delete'}>
                                                    <span className="material-icons">delete</span>
                                                </Tooltip>
                                            </div>
                                        )}
                                        <div onClick={() => _onClick(teacher.id)}>
                                            <Tooltip title={'Edit'}>
                                                <span className="material-icons edit-icon">create</span>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </CommonTable>
            )}
            {open && (
                <DialogWrapper
                    open={open}
                    setOpen={() => setOpen(!open)}
                    cancelBtn
                    dialogFooter
                    primaryBtnHandler={() => confirmDeleteTeacher()}
                    primaryBtnloading={deleteTeacherLoading}
                    primaryBtnText="Confirm"
                    contentWidth="450px">
                    <Paragraph customClass="pt2 pb5">
                        Are you sure you wish to remove {teacherToRemove?.teacher?.firstname} {teacherToRemove?.teacher?.lastname}?
                    </Paragraph>
                </DialogWrapper>
            )}
            {openError && (
                <DialogWrapper
                    open={openError}
                    setOpen={() => {
                        setTeacherToRemove({ teacher: null, mainClasses: [] });
                        setOpenError(!openError);
                    }}
                    dialogFooter
                    primaryBtnHandler={() => {
                        setTeacherToRemove({ teacher: null, mainClasses: [] });
                        setOpenError(!openError);
                    }}
                    primaryBtnText="Close"
                    heading="Error"
                    contentWidth="450px">
                    <Paragraph
                        text={`You cannot delete this teacher because they are the main teacher for ${
                            teacherToRemove?.mainClasses?.length > 1 ? 'classes' : 'class'
                        } ${(teacherToRemove?.mainClasses || [])
                            ?.map((mainClass) => mainClass?.name)
                            ?.join(
                                ', '
                            )}. Please select a different main teacher for the class first, or you can deactivate this teacher's login by pressing "edit" and setting the account to deactivated.`}
                        customClass="pt2 pb5"
                    />
                </DialogWrapper>
            )}
            {showInviteWarning.show && (
                <ConfirmationModal
                    open={showInviteWarning.show}
                    onCancel={() => setShowInviteWarning({ show: false, teacherId: null })}
                    heading={'Are you sure?'}
                    loading={inviteTeacherLoading}
                    btnText={'Send'}
                    onConfirm={() => {
                        inviteTeacherMutation({
                            variables: { input: { teacherId: showInviteWarning.teacherId, schoolId } }
                        })
                            .then(() => {
                                callSnackbar('Invitation sent.', 'success');
                                setShowInviteWarning({ show: false, teacherId: null });
                            })
                            .catch((err) => {
                                callSnackbar(err, 'error');
                                setShowInviteWarning({ show: false, teacherId: null });
                            });
                    }}>
                    <Paragraph>
                        This user rejected a previous invitation. Please make sure the contact details are correct before you proceed.
                    </Paragraph>
                </ConfirmationModal>
            )}
        </div>
    );
};

AccordionList.propTypes = {
    onClick: PropTypes.func.isRequired,
    setDefaultValues: PropTypes.func.isRequired,
    schoolId: PropTypes.string
};

export default AccordionList;
