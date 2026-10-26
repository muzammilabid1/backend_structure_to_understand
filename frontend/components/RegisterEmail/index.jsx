import { useLazyQuery, useMutation } from '@apollo/client';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { registerUserEmail } from '../../graphQl/mutations';
import { getUserByTokenForRegisterEmail } from '../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, unexpectedError } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import { RegisterEmailValidation } from '../../shared/validations';
import LWPButton from './../Shared/Button/LWPButton';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import InputField from './../Shared/InputField/InputField';

const RegisterEmail = () => {
    const queryParams = useParams();
    const router = useRouter();
    const { setHeaderTitle, callSnackbar } = useContext(ThemeContext);

    const [registerUserEmailMutation, { loading }] = useMutation(registerUserEmail);
    const [getUserByTokenQuery, { loading: getUserByTokenLoading, error, data: defaultUser }] =
        useLazyQuery(getUserByTokenForRegisterEmail);

    useEffect(() => {
        if (queryParams?.token) {
            getUserByTokenQuery({ variables: { token: queryParams?.token } });
        }
    }, [queryParams]);

    useEffect(() => setHeaderTitle('Register Email'), []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (getUserByTokenLoading) return <CommonLoading />;

    const isEmail = () => !!defaultUser?.getUserFromMagicLink?.email;

    const isNumber = () => {
        return isEmail() ? !isEmail() : !!defaultUser?.getUserFromMagicLink?.phoneNumber;
    };

    return (
        <div className="signup-page-container">
            <Formik
                initialValues={{
                    email: defaultUser?.getUserFromMagicLink?.email,
                    repeatEmail: defaultUser?.getUserFromMagicLink?.email,
                    phoneNumber: defaultUser?.getUserFromMagicLink?.phoneNumber
                }}
                validationSchema={RegisterEmailValidation}
                enableReinitialize
                onSubmit={async (values) => {
                    try {
                        await registerUserEmailMutation({
                            variables: {
                                input: {
                                    email: values.email,
                                    resetPassToken: queryParams?.token
                                }
                            }
                        });
                        callSnackbar('Email registered successfully!', 'success');
                        router?.push('/');
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
                        <form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                            <CommonStatus
                                heading="Register your email"
                                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pupil_without_round_bg1.png`}
                                className="mb5"
                            />

                            <InputField
                                type="email"
                                label="Email address"
                                md={12}
                                lg={12}
                                name="email"
                                value={values.email}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                                }}
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                                disabled={isEmail()}
                            />

                            <InputField
                                type="email"
                                label="Repeat email address"
                                md={12}
                                lg={12}
                                name="repeatEmail"
                                value={values.repeatEmail}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'repeatEmail', value: e.target.value.toLowerCase() } });
                                }}
                                onBlur={handleBlur}
                                error={errors.repeatEmail}
                                touched={touched.repeatEmail}
                                disabled={isEmail()}
                            />

                            <InputField
                                label="Mobile number"
                                md={12}
                                lg={12}
                                name="phoneNumber"
                                value={values.phoneNumber}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.phoneNumber}
                                touched={touched.phoneNumber}
                                disabled={isNumber()}
                            />

                            <LWPButton
                                btnText="Confirm details"
                                size="large"
                                type="submit"
                                customClass="login-btn"
                                onClick={handleSubmit}
                                loading={loading}
                            />
                        </form>
                    );
                }}
            </Formik>
        </div>
    );
};

export default RegisterEmail;
