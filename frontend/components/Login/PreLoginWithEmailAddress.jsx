import { gql, useLazyQuery } from '@apollo/client';
import { Alert } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { STATUS_CODES } from '../../shared/Constant';
import { _phoneValidationRegex, _removeWhiteSpace, ThemeContext } from '../../shared/Services/handler';
import { PreLoginValidationWithEmail, PreLoginValidationWithPhone } from '../../shared/validations';
import LWPButton from '../Shared/Button/LWPButton';
import InputField from '../Shared/InputField/InputField';
import Paragraph from '../Shared/Typography/Paragraph';

// Queries

const preLoginForPreLoginWithEmailAddress = gql`
    query preLogin($emailOrPhone: String!) {
        preLogin(emailOrPhone: $emailOrPhone) {
            emailOrPhone
            status
            methods
            canSendEmail
            canSendSms
        }
    }
`;

const PreLoginWithEmailAddress = ({ setPreLoginOutput, setEnteredEmail, enteredEmail }) => {
    const [_email, _setEmail] = useState('');
    const [error, setError] = useState(false);

    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    let loadingLogin = false;

    const [preLoginUser, { loginInFlight, data: preLoginOutput }] = useLazyQuery(preLoginForPreLoginWithEmailAddress);

    useEffect(() => {
        if (preLoginOutput) {
            // OK, Invited, Imported, NoSuchUser
            switch (preLoginOutput?.preLogin?.status) {
                case 'OK':
                    setPreLoginOutput(preLoginOutput?.preLogin);

                    break;

                case 'Invited':
                    router?.push({
                        pathname: '/auth/invited',
                        query: {
                            source: _email,
                            source_type: isPhoneNumber ? 'number' : 'email',
                            hasEmail: preLoginOutput?.preLogin?.canSendEmail,
                            hasPhone: preLoginOutput?.preLogin?.canSendSms,
                            magicLinkToken: preLoginOutput?.preLogin?.magicLinkToken
                        }
                    });

                    return;

                default:
                    setError(true);
                    break;
            }
        }
    }, [preLoginOutput]);

    const isPhoneNumber = _phoneValidationRegex(_email);

    return (
        <>
            <Formik
                initialValues={{
                    email: enteredEmail ?? ''
                }}
                validationSchema={isPhoneNumber ? PreLoginValidationWithPhone : PreLoginValidationWithEmail}
                onSubmit={async (values) => {
                    loadingLogin = true;

                    try {
                        await preLoginUser({
                            variables: {
                                emailOrPhone: _removeWhiteSpace(values?.email)
                            }
                        });

                        loadingLogin = false;
                    } catch ({ ...err }) {
                        const statusCode = err?.graphQLErrors?.[0]?.extensions?.exception?.status || err?.networkError?.statusCode;

                        setEnteredEmail(null);

                        if (statusCode === STATUS_CODES.SOCIAL_ACCOUNT_NOT_FOUND) {
                            setError(true);
                        } else {
                            callSnackbar(err, 'error');
                        }
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue, setValues }) => {
                    _setEmail(values.email);

                    useEffect(() => {
                        if (document.querySelector('input[name="email"]')?.value) {
                            if (!values.email) {
                                setValues({
                                    email: document.querySelector('input[name="email"]')?.value || ''
                                });
                            }
                        }
                    }, []);

                    return (
                        <form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                            <InputField
                                label="Email address or mobile number"
                                md={12}
                                lg={12}
                                name="email"
                                disabled={error}
                                endIcon={error ? 'edit' : ''}
                                endIconHandler={() => {
                                    setFieldValue(null);
                                    setError(false);
                                }}
                                autoFocus
                                value={values.email}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                                dataTest={'login-email-input'}
                            />

                            {error ? (
                                <div className="account-not-found-error">
                                    <Alert severity="error">
                                        <Paragraph>
                                            We don’t recognise this email address or phone number. If you haven’t used the site before, you
                                            will need an invitation from your school or setting.
                                        </Paragraph>
                                    </Alert>
                                    <br />
                                    <LWPButton
                                        btnText="Back"
                                        size="large"
                                        color="inherit"
                                        customClass="login-btn"
                                        onClick={() => setError(false)}
                                    />
                                </div>
                            ) : (
                                <LWPButton
                                    btnText="Next"
                                    size="large"
                                    type="submit"
                                    customClass={`login-btn`}
                                    onClick={handleSubmit}
                                    loading={loadingLogin || loginInFlight}
                                    dataTest={'login-next-button'}
                                />
                            )}
                        </form>
                    );
                }}
            </Formik>
            <br />
            {!error ? (
                <>
                    <p className="account-text">
                        Don&apos;t have an account yet?
                        <br />
                        You will need an invitation from your school or setting.
                    </p>
                </>
            ) : null}
        </>
    );
};

PreLoginWithEmailAddress.propTypes = {
    setPreLoginOutput: PropTypes.func.isRequired,
    setEnteredEmail: PropTypes.func.isRequired,
    enteredEmail: PropTypes.string
};
PreLoginWithEmailAddress.defaultProps = {
    setPreLoginOutput: () => {},
    setEnteredEmail: () => {}
};

export default PreLoginWithEmailAddress;
