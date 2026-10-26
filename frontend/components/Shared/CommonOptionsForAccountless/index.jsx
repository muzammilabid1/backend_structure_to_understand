/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { getJwtDecoded } from '../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, SocialLoginType } from '../../../shared/Constant';
import { socialLoginHandler, ThemeContext } from '../../../shared/Services/handler';
import LWPSocialButton from '../Button/SocialAuthButton';
// import CommonStatus from '../CommonStatus';
// import LinkText from '../Typography/LinkText';
// import Paragraph from '../Typography/Paragraph';

// Mutations

const getGoogleLoginUrl = gql`
    mutation getGoogleLoginUrl {
        getGoogleLoginUrl
    }
`;

const getMicrosoftAzureADLoginUrl = gql`
    mutation getMicrosoftAzureADLoginUrl {
        getMicrosoftAzureADLoginUrl
    }
`;

const reInviteParentWithEmailOrPhone = gql`
    mutation reInviteParentWithEmailOrPhone($username: String!, $preference: String!) {
        reInviteParentWithEmailOrPhone(username: $username, preference: $preference)
    }
`;

const CommonOptionsForAccountless = ({
    microsoft = false,
    google = false,
    email = false,
    sms = false,
    setIsInvited,
    setIsEmail,
    setText,
    magicLinkToken
}) => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [preference, setPreference] = useState(null);

    const [getGoogleLoginUrlMutation, { loading: getGoogleLoginUrlLoading, error: error }] = useMutation(getGoogleLoginUrl);
    const [getMicrosoftAzureADLoginUrlMutation, { loading: getMicrosoftAzureADLoginUrlLoading, error: microsoftError }] =
        useMutation(getMicrosoftAzureADLoginUrl);
    const [
        reInviteParentWithEmailOrPhoneMutation,
        { loading: reInviteParentWithEmailOrPhoneErrorLoading, error: reInviteParentWithEmailOrPhoneError }
    ] = useMutation(reInviteParentWithEmailOrPhone);

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
            router?.push('/');
        }

        if (microsoftError?.message) {
            callSnackbar(microsoftError, 'error');
            router?.push('/');
        }

        if (reInviteParentWithEmailOrPhoneError?.message) {
            callSnackbar(reInviteParentWithEmailOrPhoneError, 'error');
            router?.push('/');
        }
    }, [error, microsoftError, reInviteParentWithEmailOrPhoneError]);

    const reInviteParentHandler = (userPreference) => {
        setPreference(userPreference);
        reInviteParentWithEmailOrPhoneMutation({ variables: { username: router?.query?.source, preference: userPreference } })
            .then(() => {
                callSnackbar(`Invitation ${userPreference === 'email' ? 'email' : 'sms'} sent.`, 'success');
                setIsInvited(true);
                setIsEmail(userPreference === 'email' ? 'email' : 'sms');
                setText(false);
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            });
    };

    if (!microsoft && !google && !email && !sms) return null;

    return (
        <div className="accountless-option-container">
            <div className="accountless-options-button-container">
                <>
                    {microsoft ? (
                        <LWPSocialButton
                            btnText={`Continue with Microsoft`}
                            onClick={() => {
                                if (magicLinkToken) {
                                    const decodedMagicLinkObj = getJwtDecoded(magicLinkToken);

                                    socialLoginHandler(
                                        SocialLoginType.microsoft,
                                        router?.push,
                                        { magicLinkToken: decodedMagicLinkObj?.magicLinkToken },
                                        getMicrosoftAzureADLoginUrlMutation
                                    );
                                }
                            }}
                            loading={getMicrosoftAzureADLoginUrlLoading}
                            disabled={getMicrosoftAzureADLoginUrlLoading}
                            startIcon={
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/microsoftLogo.svg`}
                                />
                            }
                            endIcon={<span className="material-symbols-outlined">chevron_right</span>}
                        />
                    ) : null}
                    {google ? (
                        <LWPSocialButton
                            btnText={`Continue with Google`}
                            loading={getGoogleLoginUrlLoading}
                            disabled={getGoogleLoginUrlLoading}
                            onClick={() => {
                                if (magicLinkToken) {
                                    const decodedMagicLinkObj = getJwtDecoded(magicLinkToken);

                                    socialLoginHandler(
                                        SocialLoginType.google,
                                        router?.push,
                                        { magicLinkToken: decodedMagicLinkObj?.magicLinkToken },
                                        getGoogleLoginUrlMutation
                                    );
                                }
                            }}
                            startIcon={
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/googleLogo.svg`}
                                />
                            }
                            endIcon={<span className="material-symbols-outlined">chevron_right</span>}
                        />
                    ) : null}
                    {email ? (
                        <LWPSocialButton
                            btnText={`Send link by Email`}
                            onClick={() => reInviteParentHandler('email')}
                            loading={preference === 'email' && reInviteParentWithEmailOrPhoneErrorLoading}
                            disabled={preference === 'email' && reInviteParentWithEmailOrPhoneErrorLoading}
                            startIcon={
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mailIcon.png`}
                                />
                            }
                            endIcon={<span className="material-symbols-outlined">chevron_right</span>}
                        />
                    ) : null}
                    {sms ? (
                        <LWPSocialButton
                            btnText={`Send link by SMS`}
                            onClick={() => reInviteParentHandler('phone')}
                            loading={preference === 'phone' && reInviteParentWithEmailOrPhoneErrorLoading}
                            disabled={preference === 'phone' && reInviteParentWithEmailOrPhoneErrorLoading}
                            startIcon={
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mobileIcon.png`}
                                />
                            }
                            endIcon={<span className="material-symbols-outlined">chevron_right</span>}
                        />
                    ) : null}
                </>
            </div>
        </div>
    );
};

CommonOptionsForAccountless.propTypes = {
    microsoft: PropTypes.bool.isRequired,
    google: PropTypes.bool.isRequired,
    email: PropTypes.bool.isRequired,
    sms: PropTypes.bool.isRequired,
    magicLinkToken: PropTypes.string,
    setIsInvited: PropTypes.func,
    setIsEmail: PropTypes.func,
    setText: PropTypes.func
};

export default CommonOptionsForAccountless;
