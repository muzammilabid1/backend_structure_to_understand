import { useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import React, { useContext, useState } from 'react';

import { forgotPassword } from '../../graphQl/mutations';
import { MINIO_PUBLIC_PATHS, STATUS_CODES } from '../../shared/Constant';
import formInitialStates from '../../shared/formInitialStates';
import { _phoneValidationRegex, ThemeContext } from '../../shared/Services/handler';
import { forgotPasswordValidationWithEmail, forgotPasswordValidationWithPhone } from '../../shared/validations';
import LWPButton from '../Shared/Button/LWPButton';
import CommonStatus from '../Shared/CommonStatus';
import InputField from '../Shared/InputField/InputField';

const ForgotPassword = () => {
    const [forgotPasswordMutation, { loading }] = useMutation(forgotPassword);
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [_email, _setEmail] = useState('');

    const isPhoneNumber = _phoneValidationRegex(_email);

    return (
        <div className="forgot-password-page-container">
            <CommonStatus
                heading="Forgot your password?"
                subHeading="Enter your email address or mobile number and we’ll send you a link to update your password."
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                imageAlt=""
                className="mb5"
            />
            <Formik
                initialValues={{
                    ...formInitialStates['forgotPassword']
                }}
                validationSchema={isPhoneNumber ? forgotPasswordValidationWithPhone : forgotPasswordValidationWithEmail}
                onSubmit={async (values, { resetForm }) => {
                    const { email } = values;

                    forgotPasswordMutation({
                        variables: {
                            email: isPhoneNumber ? null : email.trim(),
                            phoneNumber: isPhoneNumber ? email : null
                        }
                    })
                        .then(() => {
                            resetForm({ values: '' });
                            callSnackbar(`We’ve sent a password update link to ${email}.`, 'success');
                        })
                        .catch(({ ...err }) => {
                            const statusCode = err?.graphQLErrors?.[0]?.extensions?.exception?.status || err?.networkError?.statusCode;

                            if (
                                (statusCode === STATUS_CODES._537 || statusCode === STATUS_CODES._538) &&
                                statusCode !== STATUS_CODES._403
                            ) {
                                router?.push({
                                    pathname: '/check-your-email-or-phone/invited-user',
                                    query: { source: email, source_type: isPhoneNumber ? 'number' : 'email' }
                                });

                                return;
                            } else {
                                callSnackbar(err, 'error');
                            }
                        });
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    _setEmail(values.email);

                    return (
                        <Form className="text-fields">
                            <InputField
                                label="Email address or mobile number"
                                md={12}
                                lg={12}
                                name="email"
                                autoFocus
                                value={values.email}
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                                onChange={handleChange}
                            />

                            <LWPButton
                                btnText="Send me a link"
                                type="submit"
                                customClass={'btn'}
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

export default ForgotPassword;
