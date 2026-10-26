import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { reInviteParent, resetUserPassword, updateParent } from '../../../graphQl/mutations';
import { getUserForAdmin } from '../../../graphQl/queries';
import { ADMIN, unexpectedError } from '../../../shared/Constant';
import { _removeWhiteSpace, ThemeContext } from '../../../shared/Services/handler';
import { updateParentValidationForAdmin } from '../../../shared/validations';
import CommonLoginInfoCard from '../../Shared/CommonLoginInfoCard';
import CommonNotificationSettings from '../../Shared/CommonNotificationSettings';
import CommonUserStatusLogsTable from '../../Shared/CommonUserStatusLogsTable';
import Heading1 from '../../Shared/Typography/Heading1';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonCheckBox from './../../Shared/CommonCheckBox';
import CommonLoading from './../../Shared/CommonLoading';
import InputField from './../../Shared/InputField/InputField';
import ResetPasswordModal from './../../Shared/Modals/ResetPassword';
import Heading3 from './../../Shared/Typography/Heading3';
import WondeDetails from './WondeDetails';
import { UserStatus } from 'lwp-shared';

const ChildParentDetailsAdmin = ({ setParentName }) => {
    const [link, setLink] = useState('');
    const [open, setOpen] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();

    const {
        loading,
        error: error,
        data: parent
    } = useQuery(getUserForAdmin, { variables: { id: queryParams?.parent_id }, skip: !queryParams?.parent_id });

    const [resetUserPasswordMutation, { loading: resetPwdLoading }] = useMutation(resetUserPassword);
    const [reInviteParentMutation, { loading: reInviteParentLoading }] = useMutation(reInviteParent, {
        refetchQueries: [{ query: getUserForAdmin, variables: { id: queryParams?.parent_id } }],
        awaitRefetchQueries: true
    });

    const [updateParentMutation, { loading: updateParentIsLoading }] = useMutation(updateParent, {
        refetchQueries: [{ query: getUserForAdmin, variables: { id: queryParams?.parent_id } }],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        if (parent) {
            setParentName(`${parent?.getUser?.firstname} ${parent?.getUser?.lastname}`);
        }
    }, [parent]);

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
        <div className="child_parent_detials">
            <Heading1 text="User info" customClass="child-parent-detail-heading" />
            <Formik
                initialValues={{
                    firstname: parent?.getUser?.firstname,
                    lastname: parent?.getUser?.lastname,
                    email: parent?.getUser?.email,
                    phoneNumber: parent?.getUser?.phoneNumber,
                    status: parent?.getUser?.userStatus,
                    isDeactivated:
                        parent?.getUser?.userStatus === 'DEACTIVATED' ? true : parent?.getUser?.userStatus === 'ACTIVE' ? false : null
                }}
                enableReinitialize
                validationSchema={updateParentValidationForAdmin}
                onSubmit={async (values) => {
                    try {
                        const { firstname, lastname, email, isDeactivated, phoneNumber } = values;

                        await updateParentMutation({
                            variables: {
                                input: {
                                    firstname: _removeWhiteSpace(firstname),
                                    lastname: _removeWhiteSpace(lastname),
                                    email: email?.trim().length ? email : null,
                                    phoneNumber,
                                    isDeactivated,
                                    id: queryParams?.parent_id
                                }
                            }
                        });
                        callSnackbar('Update details successful!', 'success');
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
                            label="Phone number"
                            md={8}
                            lg={8}
                            name="phoneNumber"
                            value={values.phoneNumber}
                            onChange={(e) => {
                                handleChange({ target: { name: 'phoneNumber', value: e.target.value } });
                            }}
                            onBlur={handleBlur}
                            error={errors.phoneNumber}
                            touched={touched.phoneNumber}
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

                        <CommonCheckBox
                            name="isDeactivated"
                            checked={values.isDeactivated}
                            error={errors.isDeactivated}
                            touched={touched.isDeactivated}
                            onChange={(e) => {
                                handleChange({ target: { name: 'isDeactivated', value: e.target.checked } });
                            }}
                            label="Deactivated (prevents user from logging in)"
                        />

                        <LWPButton btnText="Update details" onClick={handleSubmit} loading={updateParentIsLoading} />
                    </Form>
                )}
            </Formik>

            {parent?.getUser?.lastLoginInfo && (
                <>
                    <Heading1 text="Last accessed" customClass="child-parent-detail-heading" />
                    <CommonLoginInfoCard
                        deviceType={parent?.getUser?.lastLoginInfo?.deviceType}
                        browserName={parent?.getUser?.lastLoginInfo?.browserName}
                        loginType={parent?.getUser?.lastLoginInfo?.loginType}
                        userAgent={parent?.getUser?.lastLoginInfo?.userAgent}
                        osName={parent?.getUser?.lastLoginInfo?.osName}
                        lastLogin={parent?.getUser?.lastLoginInfo?.date}
                    />
                </>
            )}

            {parent?.getUser?.userStatusChangeLogs?.length > 0 ? (
                <CommonUserStatusLogsTable logs={parent?.getUser?.userStatusChangeLogs} />
            ) : null}

            <CommonNotificationSettings
                userId={parent?.getUser?.id}
                notificationPreference={parent?.getUser?.notificationPreference}
                viewType={ADMIN}
            />

            {(parent?.getUser?.userStatus === 'INVITED' || parent?.getUser?.userStatus === 'IMPORTED') && (
                <div className="re-invite-user">
                    <Heading3 text={'Re-Invite this user'} />
                    <LWPButton
                        btnText="Re-Invite Parent"
                        loading={reInviteParentLoading}
                        onClick={() => {
                            reInviteParentMutation({ variables: { parentId: parent?.getUser?.id } })
                                .then(() => {
                                    callSnackbar(`Invitation sent to ${parent?.getUser?.firstname}`, 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                        }}
                    />
                </div>
            )}

            <div className="reset_password">
                <Heading3 text={'Reset password'} />
                <LWPButton btnText="Reset password" loading={resetPwdLoading} onClick={() => _getLink(parent?.getUser?.email)} />
            </div>

            {!!parent?.getUser?.importedContacts?.length && <WondeDetails wondeInfo={parent?.getUser?.importedContacts} />}

            {open && (
                <ResetPasswordModal
                    name={`${parent?.getUser?.firstname} ${parent?.getUser?.lastname}`}
                    link={link}
                    open={open}
                    setOpen={setOpen}
                />
            )}
        </div>
    );
};

ChildParentDetailsAdmin.propTypes = { setParentName: PropTypes.func };

export default ChildParentDetailsAdmin;
