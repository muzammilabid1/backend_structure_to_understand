import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef, useState } from 'react';

import CommonSocialAccountInformation from '../../components/Shared/AccountNotLinked';
import LWPButton from '../../components/Shared/Button/LWPButton';
import CommonCheckBox from '../../components/Shared/CommonCheckBox';
import CommonLoading from '../../components/Shared/CommonLoading';
import RenderHtml from '../../components/Shared/CommonRenderHtml';
import CommonStatus from '../../components/Shared/CommonStatus';
import DialogWrapper from '../../components/Shared/DialogWrapper';
import InputField from '../../components/Shared/InputField/InputField';
import PasswordField from '../../components/Shared/InputField/PasswordField';
import Paragraph from '../../components/Shared/Typography/Paragraph';
import { acceptUserInvitation, signup } from '../../graphQl/mutations';
import { getParameterByKey } from '../../graphQl/queries';
import { getCookie, getJwtDecoded, removeCookie, setCookies } from '../../lib/manageCookies';
import {
    ADMIN,
    DEFAULT_MWP_TEACHER_MATHSCOT,
    DEFAULT_PARENT_WITH_CHILD_MATHSCOT,
    MINIO_PUBLIC_PATHS,
    PARENT,
    TEACHER,
    UserAssociatedLoginType
} from '../../shared/Constant';
import { STATUS_CODES } from '../../shared/Constant';
import formInitialStates from '../../shared/formInitialStates';
import { _removeWhiteSpace, capitalizeFirstLetter, ThemeContext } from '../../shared/Services/handler';
import {
    SignupValidationForAdmin,
    SignupValidationForParent,
    SignupValidationForParentForSocialLogin,
    SignupValidationForTeacher
} from '../../shared/validations';
import LinkExpiredPage from '../LinkExpiredPage';
import LinkInvalidPage from '../LinkInvalidPage';
import CommonInfoWithMessage from '../Shared/CommonInfoWithMessage';

// Queries

const getUserFromMagicLinkForSignupPage = gql`
    query getUserFromMagicLink($token: String!) {
        getUserFromMagicLink(token: $token) {
            firstname
            lastname
            email
            phoneNumber
            nameForChildren
            type
        }
    }
`;

// Mutations

// Component
const SignupPage = ({ termsAndPolicyOptions }) => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const { setHeaderTitle, callSnackbar, token } = useContext(ThemeContext);

    const [open, setOpen] = useState({ bool: false, key: '' });
    const [minimumPasswordLength, setMinimumPasswordLength] = useState(null);
    const [paramsKey, setParamsKey] = useState('');
    const [socialLoginProvider, setSocialLoginProvider] = useState(null);
    const [socialAccountDetails, setSocialAccountDetails] = useState(null);
    const [clickToOpen, SetClickToOpen] = useState(true);

    const [signupMutation, { loading }] = useMutation(signup);
    const [acceptUserInvitationMutation, { loading: acceptUserInvitationLoading }] = useMutation(acceptUserInvitation);
    const [getUserByTokenQuery, { loading: getUserByTokenLoading, error, data: defaultUser }] =
        useLazyQuery(getUserFromMagicLinkForSignupPage);

    const [getParameterByKeyQuery, { loading: getParameterByKeyLoading, error: getParameterByKeyError, data: getParameterByKeyData }] =
        useLazyQuery(getParameterByKey);

    const fetchData = () => {
        fetch('https://learningwithparents.com/wp-json/wp/v2/snippets')
            .then((response) => response.json())
            .then((data) => {
                setParamsKey(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    useEffect(() => {
        getParameterByKeyError?.message && callSnackbar(getParameterByKeyError, 'error');
    }, [getParameterByKeyError]);

    useEffect(() => {
        open.bool && fetchData();
        // && getAllParametersQuery()
    }, [open]);

    const toggle = (key) => {
        setOpen({ bool: true, key: key });
    };

    const [isParent, setIsParent] = useState(true);
    const [showLinkInvalidPage, setShowLinkInvalidPage] = useState(false);
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState(false);
    const [socialLoginJwt, setSocialLoginJwt] = useState('');

    useEffect(() => {
        if (searchParams.get('socialLogin') === 'true') {
            const jwt = getCookie('socialLoginJwt');

            setSocialLoginProvider(getCookie('socialLoginProvider'));

            if (jwt) {
                if (window?.Cypress) {
                    setSocialAccountDetails({});
                } else {
                    const accountDetails = getJwtDecoded(jwt);

                    setSocialAccountDetails(accountDetails);
                }

                setSocialLoginJwt(jwt);
            }
        }

        if (queryParams?.token) {
            getUserByTokenQuery({ variables: { token: queryParams?.token } });
        }
    }, [queryParams]);

    useEffect(() => setHeaderTitle('Sign up'), []);

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
        if (!queryParams?.token) {
            setIsParent(true);
        } else if (defaultUser?.getUserFromMagicLink) {
            const bool = defaultUser?.getUserFromMagicLink?.type === PARENT ? true : false;

            setIsParent(bool);
        }
    }, [defaultUser, queryParams]);

    useEffect(() => {
        if (defaultUser?.getUserFromMagicLink) {
            getParameterByKeyQuery({ variables: { key: 'MIN_PASSWORD_LENGTH' } });
        }
    }, [defaultUser]);

    useEffect(() => {
        if (getParameterByKeyData?.getParameterByKey?.value) {
            const minPasswordValues = JSON.parse(getParameterByKeyData?.getParameterByKey?.value);
            const minPasswordValue = minPasswordValues?.[defaultUser?.getUserFromMagicLink?.type];

            setMinimumPasswordLength(minPasswordValue);
        }
    }, [getParameterByKeyData]);

    if (getUserByTokenLoading || getParameterByKeyLoading) return <CommonLoading />;

    if (showLinkInvalidPage) return <LinkInvalidPage />;

    if (showLinkExpiredPage) return <LinkExpiredPage token={queryParams?.token} />;

    const isEmail = () => !!defaultUser?.getUserFromMagicLink?.email;
    const isNumber = () => {
        return isEmail() ? !isEmail() : !!defaultUser?.getUserFromMagicLink?.phoneNumber;
    };

    const getSubHeading = (showAccountDetails, accountDetails) => {
        if (accountDetails && showAccountDetails)
            return (
                <>
                    This account is being created for the {isParent ? 'user' : 'teacher'} invited as {accountDetails?.firstname}{' '}
                    {accountDetails?.lastname} at <strong>{`${accountDetails?.email ?? accountDetails?.phoneNumber}`}</strong> - each user
                    needs an individual invitation to our site to be associated with the right {isParent ? 'children' : 'teacher'}/school.
                </>
            );

        return null;
    };

    const validationSchema =
        defaultUser?.getUserFromMagicLink?.type === PARENT
            ? searchParams.get('socialLogin') === 'true'
                ? SignupValidationForParentForSocialLogin()
                : SignupValidationForParent(minimumPasswordLength)
            : defaultUser?.getUserFromMagicLink?.type === TEACHER
              ? SignupValidationForTeacher(minimumPasswordLength)
              : SignupValidationForAdmin(minimumPasswordLength);

    const disabledEmail = [ADMIN, TEACHER].includes(defaultUser?.getUserFromMagicLink?.type) && isEmail();

    const disabledPassword = [ADMIN, TEACHER].includes(defaultUser?.getUserFromMagicLink?.type) && isNumber();

    return (
        <div className="signup-page-container">
            <Formik
                initialValues={
                    defaultUser?.getUserFromMagicLink
                        ? {
                              ...defaultUser?.getUserFromMagicLink,
                              password: '',
                              repeatPassword: '',
                              socialLoginJwt,
                              policy: false
                          }
                        : formInitialStates['signup']
                }
                validationSchema={validationSchema}
                enableReinitialize
                onSubmit={async (values, { resetForm }) => {
                    let { email, firstname, lastname, nameForChildren, password, phoneNumber, socialLoginJwt } = values;

                    firstname = _removeWhiteSpace(firstname);
                    lastname = _removeWhiteSpace(lastname);
                    nameForChildren = _removeWhiteSpace(nameForChildren);

                    defaultUser?.getUserFromMagicLink
                        ? acceptUserInvitationMutation({
                              variables: {
                                  input: {
                                      email: email?.trim()?.length ? email : null,
                                      firstname,
                                      lastname,
                                      nameForChildren,
                                      phoneNumber,
                                      socialLoginProvider: socialLoginProvider?.toUpperCase(),
                                      socialLoginJwt,
                                      password,
                                      resetPassToken: queryParams?.token,
                                      verificationCode: searchParams.get('v')
                                  }
                              }
                          })
                              .then((res) => {
                                  const acceptUserInvitation = res?.data?.acceptUserInvitation;

                                  if (acceptUserInvitation) {
                                      const { accessToken, refreshToken } = acceptUserInvitation;

                                      callSnackbar('Your account is all set up!', 'success');
                                      resetForm({ values: '' });
                                      removeCookie('socialLoginJwt');
                                      removeCookie('socialLoginProvider');

                                      if (token && token.sub) {
                                          router.push('/signup-success');
                                      } else {
                                          setCookies(accessToken, refreshToken);
                                          router.push('/');
                                      }
                                  }
                              })
                              .catch((err) => callSnackbar(err, 'error'))
                        : signupMutation({
                              variables: { input: { email, firstname, lastname, phoneNumber, password } }
                          })
                              .then((res) => {
                                  const signup = res?.data?.signup;

                                  if (signup) {
                                      const { accessToken, refreshToken } = signup;

                                      callSnackbar('Your account is all set up!', 'success');
                                      resetForm({ values: '' });
                                      removeCookie('details');
                                      if (!token?.sub) {
                                          setCookies(accessToken, refreshToken);
                                      }

                                      router?.push('/');
                                  }
                              })
                              .catch(({ ...err }) => {
                                  const statusCode =
                                      err?.graphQLErrors?.[0]?.extensions?.exception?.status || err?.networkError?.statusCode;

                                  if (
                                      (statusCode === STATUS_CODES._537 || statusCode === STATUS_CODES._538) &&
                                      statusCode !== STATUS_CODES._403
                                  ) {
                                      router?.push({
                                          pathname: '/check-your-email-or-phone/invited-user',
                                          query: {
                                              source: statusCode === 538 ? phoneNumber : email,
                                              source_type: statusCode === 538 ? 'number' : 'email'
                                          }
                                      });

                                      return;
                                  } else {
                                      callSnackbar(err, 'error');
                                  }
                              });
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                    return (
                        <form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                            <CommonStatus
                                heading={
                                    defaultUser?.getUserFromMagicLink
                                        ? `Create an account for ${defaultUser?.getUserFromMagicLink?.firstname} ${defaultUser?.getUserFromMagicLink?.lastname}`
                                        : ''
                                }
                                subHeading={getSubHeading(
                                    searchParams.get('socialLogin') === 'true' ? true : false,
                                    defaultUser?.getUserFromMagicLink
                                )}
                                image={isParent ? DEFAULT_PARENT_WITH_CHILD_MATHSCOT : DEFAULT_MWP_TEACHER_MATHSCOT}
                                className="socail_signUp_status"
                            />

                            <InputField
                                label="First name"
                                type="text"
                                autoFocus
                                md={12}
                                lg={12}
                                name="firstname"
                                value={values.firstname}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.firstname}
                                touched={touched.firstname}
                            />
                            <InputField
                                label="Last name"
                                type="text"
                                md={12}
                                lg={12}
                                name="lastname"
                                value={values.lastname}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.lastname}
                                touched={touched.lastname}
                            />
                            <InputField
                                label="Email address"
                                type="email"
                                md={12}
                                lg={12}
                                name="email"
                                value={values.email}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                                }}
                                customClass={
                                    !disabledEmail
                                        ? searchParams.get('socialLogin') === 'false'
                                            ? clickToOpen
                                                ? 'email_address_disabled'
                                                : ''
                                            : ''
                                        : ''
                                }
                                endIcon={
                                    !disabledEmail &&
                                    searchParams.get('socialLogin') === 'false' && (
                                        <span className="material-icons cp" onClick={() => SetClickToOpen(false)}>
                                            edit
                                        </span>
                                    )
                                }
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                                disabled={disabledEmail}
                                readOnly={!disabledEmail && (searchParams.get('socialLogin') === 'false' ? clickToOpen : false)}
                            />

                            {socialAccountDetails ? (
                                <div className="social-login-card">
                                    <CommonInfoWithMessage
                                        text={'This is the email address Learning with Parents will use for contacting you.'}
                                        customClass="mb-20"
                                    />
                                    <Paragraph text={<strong>Log in with:</strong>} customClass="mb-20" />

                                    <CommonSocialAccountInformation
                                        accountName={socialAccountDetails?.name}
                                        accountEmail={socialAccountDetails?.email}
                                        socialIcon={
                                            socialLoginProvider.toUpperCase() === UserAssociatedLoginType.MICROSOFT
                                                ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/microsoftLogo.svg`
                                                : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/googleLogo.svg`
                                        }
                                        avatarIcon={socialAccountDetails?.picture ?? null}
                                        variant="square"
                                    />
                                    <CommonInfoWithMessage
                                        text={`you will be able to log in with the ${capitalizeFirstLetter(
                                            socialLoginProvider
                                        )} account above`}
                                        customClass="mb-20"
                                    />
                                </div>
                            ) : (
                                <>
                                    <PasswordField
                                        label="Password"
                                        md={12}
                                        lg={12}
                                        name="password"
                                        value={values.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.password}
                                        touched={touched.password}
                                        dataTest={'signup-password-input'}
                                    />

                                    <PasswordField
                                        label="Repeat password"
                                        md={12}
                                        lg={12}
                                        name="repeatPassword"
                                        value={values.repeatPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={errors.repeatPassword}
                                        touched={touched.repeatPassword}
                                        dataTest={'signup-repeat-password-input'}
                                    />
                                </>
                            )}

                            {defaultUser?.getUserFromMagicLink?.type === ADMIN ? (
                                <></>
                            ) : defaultUser?.getUserFromMagicLink?.type === TEACHER ? (
                                <InputField
                                    label="Name for pupils"
                                    md={12}
                                    lg={12}
                                    name="nameForChildren"
                                    value={values.nameForChildren}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.nameForChildren}
                                    touched={touched.nameForChildren}
                                />
                            ) : (
                                <>
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
                                        disabled={disabledPassword}
                                    />
                                </>
                            )}

                            <div className="bottom_section ">
                                {isParent ? (
                                    <Paragraph>
                                        We never share your personal information with any unrelated third parties (e.g. social media
                                        platforms) and we never will. We do share your comments and usage with authorised staff at your
                                        child’s school or setting. This is so they can see the progress of their class. If you provide a
                                        mobile number, we will only use this to confirm your identity (e.g. if you have forgotten your
                                        password), and to notify and remind you of tasks set for you by your child’s teacher.{' '}
                                    </Paragraph>
                                ) : (
                                    <Paragraph>
                                        We never share your personal information with any unrelated third parties (e.g. social media
                                        platforms) and we never will. Your details will be visible to authorised staff at your school or
                                        setting, and your &quot;Name for pupils&quot; will be used when communicating with parents and
                                        pupils.{' '}
                                    </Paragraph>
                                )}

                                <CommonCheckBox
                                    name="policy"
                                    checked={values.policy}
                                    error={errors.policy}
                                    touched={touched.policy}
                                    onChange={handleChange}
                                    className="mt4"
                                    dataTest={'signup-policy-checkbox'}>
                                    Before signing up to use the Learning with Parents platform, please agree to our{' '}
                                    <u
                                        onClick={() => {
                                            // setParamsKey('TERMS_AND_CONDITIONS');
                                            toggle('TERMS_AND_CONDITIONS');
                                        }}>
                                        terms and conditions
                                    </u>{' '}
                                    and our{' '}
                                    <u
                                        onClick={() => {
                                            // setParamsKey('PRIVATE_POLICY');
                                            toggle('PRIVATE_POLICY');
                                        }}>
                                        privacy policy
                                    </u>
                                    .
                                </CommonCheckBox>
                            </div>

                            <LWPButton
                                btnText={socialAccountDetails ? 'Confirm ' : 'Create an account'}
                                size="large"
                                type="submit"
                                customClass={`login-btn`}
                                onClick={handleSubmit}
                                loading={loading || acceptUserInvitationLoading}
                                dataTest={'signup-submit-btn'}
                            />
                        </form>
                    );
                }}
            </Formik>

            <DialogWrapper contentWidth="750px" open={open.bool} setOpen={() => setOpen({ bool: false })}>
                {paramsKey?.length ? (
                    (open.key === 'TERMS_AND_CONDITIONS' && (
                        <>
                            <h1>Terms and conditions</h1>
                            {termsAndPolicyOptions?.termsAndConditions ? (
                                <RenderHtml text={termsAndPolicyOptions?.termsAndConditions} />
                            ) : (
                                <RenderHtml
                                    text={(paramsKey || [])
                                        .filter((data) => data?.title.rendered === 'Terms and conditions for users')
                                        .map((data) => data?.content.rendered)}
                                />
                            )}
                        </>
                    )) ||
                    (open.key === 'PRIVATE_POLICY' && (
                        <>
                            <h1>Privacy Policy</h1>
                            {termsAndPolicyOptions?.privacyPolicy ? (
                                <RenderHtml text={termsAndPolicyOptions?.privacyPolicy} />
                            ) : (
                                <RenderHtml
                                    text={(paramsKey || [])
                                        .filter((data) => data?.title.rendered === 'Privacy and data protection')
                                        .map((data) => data?.content.rendered)}
                                />
                            )}
                        </>
                    ))
                ) : (
                    <CommonLoading />
                )}
            </DialogWrapper>
        </div>
    );
};

SignupPage.propTypes = {
    termsAndPolicyOptions: PropTypes.object
};

export default SignupPage;
