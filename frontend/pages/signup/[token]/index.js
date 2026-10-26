import { useLazyQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import LinkExpiredPage from '../../../components/LinkExpiredPage';
import LinkInvalidPage from '../../../components/LinkInvalidPage';
import LWPButton from '../../../components/Shared/Button/LWPButton';
import CommonLoading from '../../../components/Shared/CommonLoading';
import CommonSocialOptions from '../../../components/Shared/CommonSocialOptions';
import CommonStatus from '../../../components/Shared/CommonStatus';
import InputField from '../../../components/Shared/InputField/InputField';
import LinkText from '../../../components/Shared/Typography/LinkText';
import SignupComponent from '../../../components/Signup';
import { clearCookiesOnly, setCookie } from '../../../lib/manageCookies';
import { DEFAULT_MWP_TEACHER_MATHSCOT, DEFAULT_PARENT_WITH_CHILD_MATHSCOT, STATUS_CODES, TEACHER } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

// Queries

const getMagicLinkForSignUpPage = gql`
    query getMagicLink($token: String!) {
        getMagicLink(token: $token) {
            user {
                id
                firstname
                lastname
                type
                email
                phoneNumber
                socialLoginPermissions
                userStatus
                school {
                    termsAndConditions
                    privacyPolicy
                }
            }
            pupil {
                school {
                    termsAndConditions
                    privacyPolicy
                }
            }
        }
    }
`;

// Component

const SignUpPage = () => {
    const { query, push } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [showLinkInvalidPage, setShowLinkInvalidPage] = useState(false);
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState(false);
    const [termsAndPolicyOptions, setTermsAndPolicyOptions] = useState(null);
    const [signUpOptions, setSignUpOptions] = useState({ email: true });
    const [magicLinkQuery, { data: magicLinkData, loading: magicLinkLoading, error }] = useLazyQuery(getMagicLinkForSignUpPage);
    const setToken = useState(undefined)[1];

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        clearCookiesOnly();
        setToken(null);
    }, []);

    const fetchUserDataFromMagicLink = async () => {
        if (query?.token) {
            const { token } = query;

            try {
                magicLinkQuery({
                    variables: {
                        token: token
                    }
                });
            } catch (error) {
                const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                if (statusCode === STATUS_CODES.EXPIRED_MAGIC_LINK) {
                    setShowLinkExpiredPage(true);
                } else if (statusCode === STATUS_CODES.INVALID_MAGIC_LINK) {
                    setShowLinkInvalidPage(true);
                } else {
                    callSnackbar(error, 'error');
                    push('/');
                }
            }
        }
    };

    useEffect(() => {
        fetchUserDataFromMagicLink();
    }, [query]);

    useEffect(() => {
        if (magicLinkData?.getMagicLink?.user?.userStatus === 'ACTIVE') {
            push('/');

            return;
        }

        if (magicLinkData?.getMagicLink?.user?.socialLoginPermissions) {
            setSignUpOptions(JSON.parse(magicLinkData?.getMagicLink?.user?.socialLoginPermissions));

            setTermsAndPolicyOptions({
                termsAndConditions:
                    magicLinkData?.getMagicLink?.pupil?.school?.termsAndConditions ||
                    magicLinkData?.getMagicLink?.user?.school?.termsAndConditions,
                privacyPolicy:
                    magicLinkData?.getMagicLink?.pupil?.school?.privacyPolicy || magicLinkData?.getMagicLink?.user?.school?.privacyPolicy
            });
        }
    }, [magicLinkData]);

    if (magicLinkLoading) return <CommonLoading />;

    if (showLinkExpiredPage) return <LinkExpiredPage token={query?.magiclink} />;
    if (showLinkInvalidPage) return <LinkInvalidPage />;

    return (
        <>
            {query?.socialLogin ? (
                <SignupComponent termsAndPolicyOptions={termsAndPolicyOptions} />
            ) : (
                <div className="signup-page-container">
                    <CommonStatus
                        heading={`Create an account for ${magicLinkData?.getMagicLink?.user?.firstname} ${magicLinkData?.getMagicLink?.user?.lastname}`}
                        image={
                            magicLinkData?.getMagicLink?.user?.type === TEACHER
                                ? DEFAULT_MWP_TEACHER_MATHSCOT
                                : DEFAULT_PARENT_WITH_CHILD_MATHSCOT
                        }
                    />

                    <div className="text-fields">
                        {signUpOptions?.password ? (
                            <>
                                <InputField
                                    label="Email address or mobile number"
                                    md={12}
                                    lg={12}
                                    name="email"
                                    autoFocus
                                    disabled
                                    value={magicLinkData?.getMagicLink?.user?.email ?? magicLinkData?.getMagicLink?.user?.phoneNumber}
                                />
                                <LWPButton
                                    btnText="Continue to set password"
                                    size="large"
                                    customClass="email-btn"
                                    onClick={() => push({ query: { socialLogin: false, ...query } })}
                                    dataTest={'signup-continue-btn'}
                                />
                            </>
                        ) : null}
                        <CommonSocialOptions
                            microsoft={signUpOptions?.microsoft}
                            google={signUpOptions?.google}
                            hasEmail={signUpOptions?.password}
                            hasPassword={!query?.token ? false : true}
                            callback={(provider, jwt) => {
                                setCookie('socialLoginProvider', provider);
                                setCookie('socialLoginJwt', jwt);
                                push({ query: { socialLogin: true, ...query } });
                            }}
                        />
                    </div>
                    <LinkText text="Already have an account?" route="/" customClass={'mt-45'} />
                </div>
            )}
        </>
    );
};

SignUpPage.pageType = PageType.GENERAL;
SignUpPage.pageTitle = 'Sign up from invite';

export default SignUpPage;
