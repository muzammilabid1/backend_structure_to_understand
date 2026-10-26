import { gql, useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import CommonLoading from '../../../components/Shared/CommonLoading';
import { clearCookiesOnly, getCookie, removeCookie, setCookie, setCookies } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, SocialLoginType, STATUS_CODES } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const loginWithGoogle = gql`
    mutation loginWithGoogle($input: SocialLoginInput!) {
        loginWithGoogle(input: $input) {
            access_token
            refresh_token
            details
            magicLink
        }
    }
`;

const loginWithGoogleForTesting = gql`
    mutation loginWithGoogleForTesting($input: SocialLoginParametersForTesting!) {
        loginWithGoogleForTesting(input: $input) {
            access_token
            refresh_token
            details
            magicLink
        }
    }
`;

const isGoogleLoginSuccessful = gql`
    mutation isGoogleLoginSuccessful {
        isGoogleLoginSuccessful
    }
`;

const GoogleLogin = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const { callSnackbar, setToken } = useContext(ThemeContext);

    const [loginWithGoogleMutation] = useMutation(loginWithGoogle);
    const [loginWithGoogleForTestingMutation] = useMutation(loginWithGoogleForTesting);
    const [isGoogleLoginSuccessfulMutation] = useMutation(isGoogleLoginSuccessful);

    const googleLoginHandling = async () => {
        if (!router?.isReady) return;

        try {
            if (searchParams.get('code')) {
                const expectedEmailOrPhone = getCookie('expectedEmail') ?? null;
                const magicLinkToken = getCookie('magicLinkToken') ?? null;
                const accessToken = getCookie(ACCESS_TOKEN_COOKIE) ?? null;
                const cypressEmail = getCookie('cypressEmail') ?? null;
                let response = null;

                if (window?.Cypress) {
                    const testGoogleResponse = await loginWithGoogleForTestingMutation({
                        variables: {
                            input: {
                                expectedEmailOrPhone,
                                accessToken,
                                magicLinkToken,
                                cypressEmail
                            }
                        }
                    });

                    response = testGoogleResponse?.data?.loginWithGoogleForTesting;
                } else {
                    const googleResponse = await loginWithGoogleMutation({
                        variables: {
                            input: {
                                code: searchParams.get('code'),
                                params: {
                                    expectedEmailOrPhone,
                                    accessToken,
                                    magicLinkToken
                                }
                            }
                        }
                    });

                    response = googleResponse?.data?.loginWithGoogle;
                }

                if (!response) {
                    callSnackbar("Oops! Looks like we didn't get a response from Google. Please try again.", 'error');
                    window.newrelic?.noticeError('No Google response retrieved on Google auth page load', {
                        caught: true,
                        handled: true
                    });
                    router?.push('/');
                }

                removeCookie('expectedEmail');
                removeCookie('magicLinkToken');
                removeCookie('signUpLink');
                removeCookie('cypressEmail');

                if (response?.magicLink) {
                    setCookie('details', response?.details);
                    router?.push(`/signup/${response?.magicLink}?socialLogin=true`);
                } else if (response?.details) {
                    setCookie('temp_access_token', response?.access_token);
                    setCookie('temp_refresh_token', response?.refresh_token);
                    setCookie('details', response?.details);
                    router?.push({
                        pathname: '/account-not-linked'
                    });
                } else {
                    setCookies(response?.access_token, response?.refresh_token);
                    callSnackbar('Login successful!', 'success');

                    const url = searchParams.get('state') || '/';

                    router?.push(url);

                    await isGoogleLoginSuccessfulMutation({
                        context: {
                            headers: {
                                authorization: `Bearer ${response?.access_token}`
                            }
                        }
                    });
                }
            } else {
                callSnackbar("Oops! Looks like we didn't get a code from Google. Please try again.", 'error');
                window.newrelic?.noticeError('No Google code retrieved on Google auth page load', { caught: true, handled: true });
                router?.push('/');
            }
        } catch ({ ...err }) {
            const statusCode = err?.graphQLErrors?.[0]?.extensions?.exception?.status || err?.networkError?.statusCode;

            removeCookie('expectedEmail');
            removeCookie('magicLinkToken');
            removeCookie('cypressEmail');

            if (statusCode === STATUS_CODES.WRONG_SOCIAL_ACCOUNT) {
                const errorResponse = err?.graphQLErrors?.[0]?.extensions?.exception?.response;

                router?.push({
                    pathname: '/wrong-account',
                    query: { social: errorResponse?.social === SocialLoginType.microsoft ? 'microsoft' : 'google' }
                });
            } else if (statusCode === STATUS_CODES.CANNOT_LINK_SOCIAL_ACCOUNT) {
                clearCookiesOnly();
                setToken(null);
                router?.push({
                    pathname: '/cannot-link-account'
                });
            } else if (statusCode === STATUS_CODES.SOCIAL_ACCOUNT_NOT_FOUND) {
                router?.push({
                    pathname: '/account-not-found',
                    query: { login: false, source_type: 'email' }
                });
            } else {
                callSnackbar(err, 'error');
                window.newrelic?.noticeError(err, { caught: true, handled: true });
                router?.push('/');
            }
        }
    };

    useEffect(() => {
        if (router?.isReady) {
            googleLoginHandling();
        }
    }, [router?.isReady]);

    return <CommonLoading />;
};

GoogleLogin.pageType = PageType.GENERAL;
GoogleLogin.pageTitle = 'Google sign-in';

export default GoogleLogin;
