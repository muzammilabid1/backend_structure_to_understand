import { gql, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { forgotPassword } from '../../graphQl/mutations';
import { setCookie, setCookies } from '../../lib/manageCookies';
import { STATUS_CODES } from '../../shared/Constant';
import { _phoneValidationRegex, _removeWhiteSpace, ThemeContext } from '../../shared/Services/handler';
import { LoginValidationWithEmail, LoginValidationWithPhone } from '../../shared/validations';
import LWPButton from '../Shared/Button/LWPButton';
import CommonCheckBox from '../Shared/CommonCheckBox';
import CommonSocialOptions from '../Shared/CommonSocialOptions';
import InputField from '../Shared/InputField/InputField';
import PasswordField from '../Shared/InputField/PasswordField';
import LinkText from '../Shared/Typography/LinkText';
import Paragraph from '../Shared/Typography/Paragraph';

// Mutations

const loginForLoginWithEmailPasswordForm = gql`
    mutation login($emailOrPhone: String!, $token: String!, $remember: Boolean!, $provider: AuthMethod!) {
        login(emailOrPhone: $emailOrPhone, authToken: $token, provider: $provider, remember: $remember) {
            accessToken
            refreshToken
        }
    }
`;

const LoginWithEmailPasswordForm = ({ emailOrPhone, methods, setPreLoginOutput, setEnteredEmail }) => {
    const [_email, _setEmail] = useState('');
    const [allowedLoginStrategies, setAllowedLoginStrategies] = useState({
        password: true,
        google: false,
        microsoft: false,
        showPasswordBtn: true
    });
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const [loginUser, { loading, data: loginOutput }] = useMutation(loginForLoginWithEmailPasswordForm);
    const [forgotPasswordMutation, { loading: loadingForgotPassword }] = useMutation(forgotPassword);

    useEffect(() => {
        setAllowedLoginStrategies({
            password: methods?.includes('Password'),
            google: methods?.includes('Google'),
            microsoft: methods?.includes('Microsoft'),
            showPasswordBtn: methods?.includes('Microsoft') || methods?.includes('Google')
        });
    }, [methods]);

    useEffect(() => {
        if (loginOutput?.login) {
            const { accessToken, refreshToken } = loginOutput.login;

            setEnteredEmail(null);
            setCookie('currentLogin', _email);
            setCookies(accessToken, refreshToken);
            router?.reload();
        }
    }, [loginOutput]);

    const isPhoneNumber = _phoneValidationRegex(_email);

    const loginForProvider = async (provider, token, rememberMe) => {
        try {
            await loginUser({
                variables: {
                    emailOrPhone: _removeWhiteSpace(_email),
                    token,
                    remember: rememberMe ?? false,
                    provider
                }
            });
        } catch (err) {
            callSnackbar(err, 'error');
            throw err;
        }
    };

    const resendPassword = async () => {
        forgotPasswordMutation({
            variables: {
                email: isPhoneNumber ? null : emailOrPhone,
                phoneNumber: isPhoneNumber ? emailOrPhone : null
            }
        })
            .then(() => {
                setPreLoginOutput(null);
                callSnackbar(`We’ve sent a password update link to ${emailOrPhone}.`, 'success');
            })
            .catch(({ ...err }) => {
                const statusCode = err?.graphQLErrors?.[0]?.extensions?.exception?.status || err?.networkError?.statusCode;

                if ((statusCode === STATUS_CODES._537 || statusCode === STATUS_CODES._538) && statusCode !== STATUS_CODES._403) {
                    router?.push({
                        pathname: '/check-your-email-or-phone/invited-user',
                        query: { source: emailOrPhone, source_type: isPhoneNumber ? 'number' : 'email' }
                    });

                    return;
                } else {
                    callSnackbar(err, 'error');
                }
            });
    };

    return (
        <>
            <Formik
                initialValues={{
                    email: emailOrPhone,
                    password: '',
                    rememberMe: false
                }}
                validationSchema={isPhoneNumber ? LoginValidationWithPhone : LoginValidationWithEmail}
                onSubmit={async (values, { resetForm }) => {
                    try {
                        const { password, rememberMe } = values;

                        await loginForProvider('Password', password, rememberMe);
                        resetForm({ values: '' });
                        callSnackbar('Login successful!', 'success');
                    } catch ({ ...err }) {
                        const extensions = err?.graphQLErrors?.[0]?.extensions;
                        const statusCode =
                            extensions?.exception?.status || extensions?.response.statusCode || err?.networkError?.statusCode;

                        if (statusCode === 401) {
                            callSnackbar('Whoops, that looks like the wrong password. Please try again.', 'error', 'Incorrect password');
                        } else if (statusCode === STATUS_CODES._537 || statusCode === STATUS_CODES._538) {
                            router?.push({
                                pathname: '/check-your-email-or-phone/invited-user',
                                query: { source: emailOrPhone, source_type: isPhoneNumber ? 'number' : 'email' }
                            });

                            return;
                        } else {
                            callSnackbar(err, 'error');
                        }

                        resetForm();
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    _setEmail(values.email);

                    return (
                        <form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                            <InputField
                                label="Email address or mobile number"
                                md={12}
                                lg={12}
                                name="email"
                                disabled
                                endIcon={'edit'}
                                endIconHandler={() => setPreLoginOutput(null)}
                                value={values.email}
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                                dataTest={'login-email-input'}
                            />
                            {allowedLoginStrategies?.showPasswordBtn ? (
                                <CommonSocialOptions
                                    expectedEmail={_email}
                                    microsoft={allowedLoginStrategies?.microsoft}
                                    google={allowedLoginStrategies?.google}
                                    hasEmail={allowedLoginStrategies?.password}
                                    callback={loginForProvider}
                                />
                            ) : null}

                            {allowedLoginStrategies?.password && !allowedLoginStrategies?.showPasswordBtn ? (
                                <div className="password-button-container">
                                    <PasswordField
                                        label="Password"
                                        md={12}
                                        lg={12}
                                        name="password"
                                        value={values.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        autoFocus
                                        error={errors.password}
                                        touched={touched.password}
                                        dataTest={'login-password-input'}
                                    />

                                    <Grid container className="password_container">
                                        <Grid container justifyContent={'space-between'} alignItems={'center'}>
                                            <CommonCheckBox
                                                name="rememberMe"
                                                checked={values.rememberMe}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                error={errors.rememberMe}
                                                touched={touched.rememberMe}
                                                label="Keep me logged in"
                                            />

                                            <LinkText text="Forgotten password?" route="/forgot-password" />
                                        </Grid>
                                        <Grid container justifyContent={'center'} className="login_btn_container">
                                            <LWPButton
                                                btnText="Log in"
                                                size="large"
                                                type="submit"
                                                customClass={`login-btn mt-15`}
                                                onClick={handleSubmit}
                                                loading={loading}
                                                dataTest={'login-submit-button'}
                                            />
                                        </Grid>
                                    </Grid>
                                </div>
                            ) : allowedLoginStrategies?.password && allowedLoginStrategies?.showPasswordBtn ? (
                                <LWPButton
                                    btnText="Log in with password"
                                    startIcon="key"
                                    color="inherit"
                                    variant="outlined"
                                    customClass="login_password_btn"
                                    onClick={() => setAllowedLoginStrategies({ ...allowedLoginStrategies, showPasswordBtn: false })}
                                />
                            ) : (
                                <>
                                    <Paragraph>Trouble signing in?</Paragraph>
                                    {!loadingForgotPassword ? (
                                        <LinkText
                                            text={'Create a password to use instead'}
                                            onClick={() => !loadingForgotPassword && resendPassword()}
                                        />
                                    ) : (
                                        <></>
                                    )}
                                </>
                            )}
                        </form>
                    );
                }}
            </Formik>
            {!emailOrPhone ? (
                <>
                    <br />
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

LoginWithEmailPasswordForm.propTypes = {
    emailOrPhone: PropTypes.string.isRequired,
    methods: PropTypes.arrayOf(PropTypes.string).isRequired,
    setPreLoginOutput: PropTypes.func,
    setEnteredEmail: PropTypes.func
};

export default LoginWithEmailPasswordForm;
