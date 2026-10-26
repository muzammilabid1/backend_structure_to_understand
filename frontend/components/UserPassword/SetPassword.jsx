import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { getParameterByKey } from '../../graphQl/queries';
import { PARENT, unexpectedError } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import { ChangeUserPasswordValidation } from '../../shared/validations';
import LWPButton from '../Shared/Button/LWPButton';
import CommonLoading from '../Shared/CommonLoading';
import PasswordField from '../Shared/InputField/PasswordField';
import Heading1 from '../Shared/Typography/Heading1';

// Mutations

const changePasswordForSetPassword = gql`
    mutation changeUserPassword($id: String!, $oldPassword: String, $password: String!) {
        changeUserPassword(id: $id, oldPassword: $oldPassword, password: $password) {
            id
        }
    }
`;

const SetPassword = ({ userId, userType, hasPassword = false }) => {
    const router = useRouter();
    const [minimumPasswordLength, setMinimumPasswordLength] = useState(null);
    const { callSnackbar } = useContext(ThemeContext);
    const [changePasswordMutation, { loading }] = useMutation(changePasswordForSetPassword);

    const [getParameterByKeyQuery, { loading: getParameterByKeyLoading, error: getParameterByKeyError, data: getParameterByKeyData }] =
        useLazyQuery(getParameterByKey);

    useEffect(() => {
        if (userType) {
            getParameterByKeyQuery({ variables: { key: 'MIN_PASSWORD_LENGTH' } });
        }
    }, [userType]);

    useEffect(() => {
        getParameterByKeyError?.message && callSnackbar(getParameterByKeyError, 'error');
    }, [getParameterByKeyError]);

    useEffect(() => {
        if (getParameterByKeyData?.getParameterByKey?.value) {
            const minPasswordValues = JSON.parse(getParameterByKeyData?.getParameterByKey?.value);
            const minPasswordValue = minPasswordValues?.[userType];

            setMinimumPasswordLength(minPasswordValue);
        }
    }, [getParameterByKeyData]);

    const validationSchema = ChangeUserPasswordValidation(minimumPasswordLength);

    if (getParameterByKeyLoading) return <CommonLoading />;

    return (
        <Formik
            initialValues={{ oldPassword: '', newPassword: '', confirmNewPassword: '' }}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={async (values) => {
                try {
                    const { oldPassword, newPassword } = values;

                    await changePasswordMutation({
                        variables: {
                            id: userId,
                            oldPassword,
                            password: newPassword
                        }
                    });
                    callSnackbar('Password changed successfully', 'success');
                    if (userType === PARENT) {
                        router?.push('/settings');
                    } else {
                        router?.push('/account');
                    }
                } catch (error) {
                    const statusCode =
                        error?.graphQLErrors?.[0]?.extensions?.exception?.status ||
                        error?.networkError?.statusCode ||
                        error?.graphQLErrors?.[0]?.extensions?.response?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                <Form>
                    <div className="change-password-wrapper">
                        <Heading1
                            text={hasPassword ? 'Change your password' : 'Set your password'}
                            customClass="mt16 pb6 account-settings-heading"
                        />
                        {hasPassword && (
                            <PasswordField
                                value={values.oldPassword}
                                name={'oldPassword'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.oldPassword}
                                touched={touched.oldPassword}
                                label="Current password"
                            />
                        )}
                        <PasswordField
                            value={values.newPassword}
                            name={'newPassword'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.newPassword}
                            touched={touched.newPassword}
                            label={hasPassword ? 'New password' : 'Password'}
                        />
                        <div className="confirm-new-password">
                            <PasswordField
                                value={values.confirmNewPassword}
                                name={'confirmNewPassword'}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.confirmNewPassword}
                                touched={touched.confirmNewPassword}
                                label={hasPassword ? 'Confirm new password' : 'Confirm password'}
                            />
                        </div>
                        <LWPButton btnText={hasPassword ? 'Change password' : 'Set password'} onClick={handleSubmit} loading={loading} />
                    </div>
                </Form>
            )}
        </Formik>
    );
};

SetPassword.propTypes = {
    userId: PropTypes.number.isRequired,
    userType: PropTypes.string.isRequired,
    hasPassword: PropTypes.bool
};

export default SetPassword;
