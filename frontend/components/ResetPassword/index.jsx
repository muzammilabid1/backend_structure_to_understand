import { useLazyQuery, useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { resetPasswordByToken } from '../../graphQl/mutations';
import { getParameterByKey, getUserFromMagicLink } from '../../graphQl/queries';
import { STATUS_CODES, unexpectedError } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import { resetPasswordValidationWithEmail, resetPasswordValidationWithPhone } from '../../shared/validations';
import LinkExpiredPage from '../LinkExpiredPage';
import LinkInvalidPage from '../LinkInvalidPage';
import LWPButton from './../Shared/Button/LWPButton';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import InputField from './../Shared/InputField/InputField';
import PasswordField from './../Shared/InputField/PasswordField';
const ResetPassword = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const router = useRouter();
    const [resetPasswordByTokenMutation, { loading }] = useMutation(resetPasswordByToken);
    const [minimumPasswordLength, setMinimumPasswordLength] = useState(null);
    const [showLinkInvalidPage, setShowLinkInvalidPage] = useState(false);
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState(false);

    const [getUserFromMagicLinkQuery, { loading: getUserFromMagicLinkLoading, error, data }] = useLazyQuery(getUserFromMagicLink);

    const [getParameterByKeyQuery, { loading: getParameterByKeyLoading, error: getParameterByKeyError, data: getParameterByKeyData }] =
        useLazyQuery(getParameterByKey);

    useEffect(() => {
        if (queryParams?.token) {
            getUserFromMagicLinkQuery({
                variables: {
                    token: queryParams?.token
                }
            });
        }
    }, [queryParams]);

    useEffect(() => {
        if (data?.getUserFromMagicLink?.type) {
            getParameterByKeyQuery({ variables: { key: 'MIN_PASSWORD_LENGTH' } });
        }
    }, [data?.getUserFromMagicLink]);

    useEffect(() => {
        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

        if (statusCode === STATUS_CODES.INVALID_MAGIC_LINK) {
            setShowLinkInvalidPage(true);
        }

        if (statusCode === STATUS_CODES.EXPIRED_MAGIC_LINK) {
            setShowLinkExpiredPage(true);
        }
    }, [error]);

    useEffect(() => {
        getParameterByKeyError?.message && callSnackbar(getParameterByKeyError, 'error');
    }, [getParameterByKeyError]);

    useEffect(() => {
        if (getParameterByKeyData?.getParameterByKey?.value) {
            const minPasswordValues = JSON.parse(getParameterByKeyData?.getParameterByKey?.value);
            const minPasswordValue = minPasswordValues?.[data?.getUserFromMagicLink?.type];

            setMinimumPasswordLength(minPasswordValue);
        }
    }, [getParameterByKeyData]);

    if (getUserFromMagicLinkLoading || getParameterByKeyLoading) return <CommonLoading />;

    if (showLinkInvalidPage) return <LinkInvalidPage buttonText="Back to Forgot Password" onClickPath="/forgot-password" />;
    if (showLinkExpiredPage) return <LinkExpiredPage token={queryParams?.token} />;

    const validationSchema = data?.getUserFromMagicLink?.email
        ? resetPasswordValidationWithEmail(minimumPasswordLength)
        : resetPasswordValidationWithPhone(minimumPasswordLength);

    const setPassword = router?.query?.hasPassword == 'false';

    return (
        <div className="reset-password-page-container">
            <CommonStatus heading={setPassword ? 'Set your password' : 'Reset your password'} className="mb5" />
            <Formik
                initialValues={{
                    email: data?.getUserFromMagicLink?.email ?? data?.getUserFromMagicLink?.phoneNumber,
                    password: '',
                    confirmPassword: ''
                }}
                validationSchema={validationSchema}
                onSubmit={async (values, { resetForm }) => {
                    try {
                        const { email, password } = values;

                        await resetPasswordByTokenMutation({
                            variables: {
                                input: {
                                    email: data?.getUserFromMagicLink?.email ? email : null,
                                    phoneNumber: data?.getUserFromMagicLink?.phoneNumber ? email : null,
                                    password,
                                    resetPassToken: queryParams?.token
                                }
                            }
                        });
                        router?.push('/');
                        resetForm({ values: '' });
                        callSnackbar('We’ve updated your password. Please log in with your new details to continue.', 'success');
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
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    return (
                        <Form className="text-fields">
                            <InputField
                                label="Email address or mobile number"
                                md={12}
                                lg={12}
                                name="email"
                                disabled={true}
                                autoFocus
                                value={values.email}
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                            />

                            <PasswordField
                                label="New password"
                                md={12}
                                lg={12}
                                name="password"
                                value={values.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.password}
                                touched={touched.password}
                            />

                            <PasswordField
                                label="Confirm password"
                                md={12}
                                lg={12}
                                name="confirmPassword"
                                value={values.confirmPassword}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.confirmPassword}
                                touched={touched.confirmPassword}
                            />

                            <LWPButton
                                btnText={setPassword ? 'Set password' : 'Reset password'}
                                type="submit"
                                customClass="btn"
                                onClick={handleSubmit}
                                loading={loading}
                            />
                        </Form>
                    );
                }}
            </Formik>
        </div>
    );
};

export default ResetPassword;
