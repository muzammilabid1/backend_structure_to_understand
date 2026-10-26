import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { inviteTeacher, resetUserPassword, updateTeacher } from '../../../graphQl/mutations';
import { getTeacher } from '../../../graphQl/queries';
import { unexpectedError } from '../../../shared/Constant';
import { showDate, ThemeContext } from '../../../shared/Services/handler';
import { updateTeacherValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonCheckBox from '../../Shared/CommonCheckBox';
import CommonLoading from '../../Shared/CommonLoading';
import CommonLoginInfoCard from '../../Shared/CommonLoginInfoCard';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import CommonUserStatusLogsTable from '../../Shared/CommonUserStatusLogsTable';
import InputField from '../../Shared/InputField/InputField';
import ResetPasswordModal from '../../Shared/Modals/ResetPassword';
import Heading1 from '../../Shared/Typography/Heading1';
import Heading3 from '../../Shared/Typography/Heading3';

const Details = ({ teacher_id, setTeacherName, setTeacherLastAccess }) => {
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error: error, data: teacher } = useQuery(getTeacher, { variables: { id: teacher_id } });
    const [resetUserPasswordMutation, { loading: resetPwdLoading }] = useMutation(resetUserPassword);
    const [updateTeacherMutation, { loading: updateTeacherLoading }] = useMutation(updateTeacher, {
        refetchQueries: [{ query: getTeacher, variables: { id: teacher_id } }],
        awaitRefetchQueries: true
    });
    const [inviteTeacherMutation, { loading: inviteTeacherLoading }] = useMutation(inviteTeacher);
    const [link, setLink] = useState('');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (teacher) {
            setTeacherName(`${teacher?.teacher?.firstname} ${teacher?.teacher?.lastname}`);
            setTeacherLastAccess(teacher?.teacher?.lastAccess);
        }
    }, [teacher]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _getLink = (email) => {
        resetUserPasswordMutation({ variables: { email } })
            .then(({ data }) => {
                setLink(data?.resetUserPassword?.link);
                setOpen(true);
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    if (loading) return <CommonLoading />;

    return (
        <div>
            <Formik
                enableReinitialize
                initialValues={{
                    email: teacher?.teacher?.email,
                    firstname: teacher?.teacher?.firstname,
                    lastname: teacher?.teacher?.lastname,
                    nameForChildren: teacher?.teacher?.nameForChildren,
                    lastAccess: teacher?.teacher?.lastAccess ? showDate({ date: teacher?.teacher?.lastAccess, time: true }) : '-',
                    status: teacher?.teacher?.userStatus,
                    schoolName: teacher?.teacher?.school?.schoolName,
                    role: teacher?.teacher?.isSchoolLeader ? 'SCHOOL_LEADER' : 'CLASS_TEACHER',
                    isDeactivated:
                        teacher?.teacher?.userStatus === 'DEACTIVATED' ? true : teacher?.teacher?.userStatus === 'ACTIVE' ? false : null
                }}
                validationSchema={updateTeacherValidation}
                onSubmit={async (values) => {
                    try {
                        const { firstname, lastname, email, nameForChildren, role, isDeactivated, phoneNumber } = values;

                        await updateTeacherMutation({
                            variables: {
                                input: {
                                    id: teacher_id,
                                    firstname,
                                    lastname,
                                    email,
                                    phoneNumber,
                                    nameForChildren,
                                    role,
                                    isDeactivated,
                                    schoolId: teacher?.teacher?.school?.id ?? queryParams?.school_id
                                }
                            }
                        });
                        callSnackbar('Changes saved', 'success');
                    } catch (error) {
                        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(error, 'error');
                        } else {
                            window.newrelic?.noticeError(error, { caught: true, handled: false });
                            callSnackbar(unexpectedError, 'error');
                        }
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <InputField
                            label="First name"
                            md={8}
                            lg={8}
                            name="firstname"
                            value={values.firstname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.firstname}
                            touched={touched.firstname}
                        />
                        <InputField
                            label="Last name"
                            md={8}
                            lg={8}
                            name="lastname"
                            value={values.lastname}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.lastname}
                            touched={touched.lastname}
                        />

                        <InputField
                            type="email"
                            label="Email address"
                            md={8}
                            lg={8}
                            name="email"
                            value={values.email}
                            onChange={(e) => {
                                handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                            }}
                            onBlur={handleBlur}
                            error={errors.email}
                            touched={touched.email}
                        />

                        <InputField
                            label="Known to pupils as"
                            md={8}
                            lg={8}
                            name="nameForChildren"
                            value={values.nameForChildren}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.nameForChildren}
                            touched={touched.nameForChildren}
                        />

                        <InputField
                            label="Last Access"
                            md={8}
                            lg={8}
                            name="lastAccess"
                            disabled
                            value={values.lastAccess}
                            onChange={(e) => {
                                handleChange({ target: { name: 'lastAccess', value: e.target.value } });
                            }}
                            onBlur={handleBlur}
                            error={errors.lastAccess}
                            touched={touched.lastAccess}
                        />
                        <InputField
                            label="Status"
                            md={8}
                            lg={8}
                            name="status"
                            disabled
                            value={values.status}
                            onChange={(e) => {
                                handleChange({ target: { name: 'status', value: e.target.value } });
                            }}
                            onBlur={handleBlur}
                            error={errors.status}
                            touched={touched.status}
                        />

                        <InputField
                            label="School Name"
                            md={8}
                            lg={8}
                            name="schoolName"
                            // disabled
                            value={values.schoolName}
                            endCommonTooltipIcon={
                                <CommonTooltipIcon
                                    text="Go to school details"
                                    onClick={() => router?.push(`/admin/school/${teacher?.teacher?.school?.id}`)}
                                    icon={'exit_to_app'}
                                />
                            }
                        />

                        {(teacher?.teacher?.userStatus === 'ACTIVE' || teacher?.teacher?.userStatus === 'DEACTIVATED') && (
                            <CommonCheckBox
                                name="isDeactivated"
                                checked={values.isDeactivated}
                                error={errors.isDeactivated}
                                touched={touched.isDeactivated}
                                onChange={handleChange}
                                label="Deactivated (prevents user from logging in)"
                            />
                        )}

                        <LWPButton btnText="Update details" onClick={handleSubmit} loading={updateTeacherLoading} />
                    </Form>
                )}
            </Formik>

            {teacher?.teacher?.lastLoginInfo && (
                <>
                    <Heading1 text="Last accessed" customClass="child-parent-detail-heading" style={{ fontSize: '24px' }} />
                    <CommonLoginInfoCard
                        deviceType={teacher?.teacher?.lastLoginInfo?.deviceType}
                        browserName={teacher?.teacher?.lastLoginInfo?.browserName}
                        loginType={teacher?.teacher?.lastLoginInfo?.loginType}
                        userAgent={teacher?.teacher?.lastLoginInfo?.userAgent}
                        osName={teacher?.teacher?.lastLoginInfo?.osName}
                        lastLogin={teacher?.teacher?.lastLoginInfo?.date}
                    />
                </>
            )}
            {teacher?.teacher?.userStatusChangeLogs?.length > 0 ? (
                <CommonUserStatusLogsTable logs={teacher?.teacher?.userStatusChangeLogs} />
            ) : null}
            {teacher?.teacher?.userStatus === 'INVITED' && (
                <div className="re-invite-user">
                    <Heading3 text={'Re-Invite this user'} />
                    <br />
                    <LWPButton
                        btnText="Re-Invite"
                        loading={inviteTeacherLoading}
                        onClick={() => {
                            inviteTeacherMutation({
                                variables: { input: { teacherId: teacher?.teacher?.id, schoolId: teacher?.teacher?.school?.id } }
                            })
                                .then(() => {
                                    callSnackbar(`Invitation sent to ${teacher?.teacher?.firstname}`, 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                        }}
                    />
                </div>
            )}
            <div className="reset_password">
                <Heading3 text={'Reset password'} />
                <LWPButton btnText="Reset password" loading={resetPwdLoading} onClick={() => _getLink(teacher?.teacher?.email)} />
            </div>
            {open && (
                <ResetPasswordModal
                    name={`${teacher?.teacher?.firstname} ${teacher?.teacher?.lastname}`}
                    link={link}
                    open={open}
                    setOpen={setOpen}
                />
            )}
        </div>
    );
};

Details.propTypes = { teacher_id: PropTypes.string, setTeacherName: PropTypes.string, setTeacherLastAccess: PropTypes.string };

export default Details;
