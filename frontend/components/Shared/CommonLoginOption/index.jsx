/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { Paper } from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS, SocialLoginType, UserAssociatedLoginType } from '../../../shared/Constant';
import { capitalizeFirstLetter, socialLoginHandler, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonLoading from '../CommonLoading';
import GoogleLoginButton from '../GoogleLoginButton';
import MicrosoftLoginButton from '../MicrosoftLoginButton';
import DisconnectConfirmationModal from '../Modals/ConfirmationModal';
import Heading3 from '../Typography/Heading3';
import Paragraph from '../Typography/Paragraph';

// Queries

const getUserForCommonLoginOption = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            hasPassword
            email
            socialAccounts {
                id
                accountId
                accountType
                email
                firstname
                lastname
            }
            school {
                socialLoginPermissions {
                    email
                    microsoft
                    google
                }
            }
        }
    }
`;

// Mutations

const connectSocialAccountForCommonLoginOption = gql`
    mutation connectSocialAccount($provider: UserAssociatedLoginType!, $idToken: String!) {
        connectSocialAccount(provider: $provider, idToken: $idToken)
    }
`;

const disconnectSocialAccountForCommonLoginOption = gql`
    mutation disconnectSocialAccount($userId: String!, $accountId: String!) {
        disconnectSocialAccount(userId: $userId, accountId: $accountId) {
            status
            msg
        }
    }
`;

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

// Component

const CommonLoginOption = ({ userId, type, socialAccount, isPasswordSet, hasMoreConnectedSocialAccounts, picture }) => {
    const [openDisconnectAccountConfirmationModal, setOpenDisconnectAccountConfirmationModal] = useState(false);
    const [openCannotDisconnectSocialAccountWarning, setOpenCannotDisconnectSocialAccountWarning] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);
    const router = useRouter();

    const [connectSocialAccountMutation, { loading: connectSocialAccountLoading }] = useMutation(connectSocialAccountForCommonLoginOption, {
        refetchQueries: [{ query: getUserForCommonLoginOption, variables: { id: userId } }],
        awaitRefetchQueries: true
    });

    const [disconnectSocialAccountMutation, { loading: disconnectSocialAccountLoading }] = useMutation(
        disconnectSocialAccountForCommonLoginOption,
        {
            refetchQueries: [{ query: getUserForCommonLoginOption, variables: { id: userId } }],
            awaitRefetchQueries: true
        }
    );
    const [getGoogleLoginUrlMutation, { loading: getGoogleLoginUrlLoading, error: error }] = useMutation(getGoogleLoginUrl);
    const [getMicrosoftAzureADLoginUrlMutation, { loading: getMicrosoftAzureADLoginUrlLoading, error: microsoftError }] =
        useMutation(getMicrosoftAzureADLoginUrl);

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
            router?.push(router?.asPath);
        }

        if (microsoftError?.message) {
            callSnackbar(microsoftError, 'error');
            router?.push(router?.asPath);
        }
    }, [error, microsoftError]);

    const isAccountLinked = type === UserAssociatedLoginType.PASSWORD ? isPasswordSet : socialAccount?.accountType === type;

    const canDisconnectSocialAccount =
        type !== UserAssociatedLoginType.PASSWORD && !isPasswordSet && !hasMoreConnectedSocialAccounts && socialAccount?.accountId
            ? false
            : true;

    const btnText =
        type === UserAssociatedLoginType.PASSWORD
            ? isAccountLinked
                ? 'Change password'
                : 'Set password'
            : isAccountLinked
              ? 'Disconnect'
              : 'Connect';

    const headingText =
        type === UserAssociatedLoginType.PASSWORD
            ? 'Learning with Parents password'
            : isAccountLinked
              ? `${socialAccount?.firstname} ${socialAccount?.lastname}`
              : capitalizeFirstLetter(type);

    const btnColor =
        type === UserAssociatedLoginType.PASSWORD ? (isAccountLinked ? 'inherit' : 'primary') : isAccountLinked ? 'inherit' : 'primary';

    const btnIcon =
        type === UserAssociatedLoginType.PASSWORD ? (
            isAccountLinked ? (
                <span className="material-icons">lock</span>
            ) : (
                <span className="material-icons">add</span>
            )
        ) : isAccountLinked ? (
            <img src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/signal_disconnected.png`} />
        ) : (
            <span className="material-icons">add</span>
        );

    const connectToSocialAccount = () => {
        if (type === UserAssociatedLoginType.MICROSOFT) {
            socialLoginHandler(SocialLoginType.microsoft, router?.push, {}, getMicrosoftAzureADLoginUrlMutation);
        } else {
            socialLoginHandler(SocialLoginType.google, router?.push, {}, getGoogleLoginUrlMutation);
        }
    };

    const btnHandler = (isAccountLinked) => {
        if (type === UserAssociatedLoginType.PASSWORD) {
            router?.push({ pathname: '/user-password' });
        } else {
            if (isAccountLinked) {
                if (canDisconnectSocialAccount) {
                    return setOpenDisconnectAccountConfirmationModal(true);
                } else {
                    return setOpenCannotDisconnectSocialAccountWarning(true);
                }
            } else {
                return connectToSocialAccount();
            }
        }
    };

    const connectSocialAccount = (getToken) => {
        return (...args) => {
            let idToken;

            if (window?.Cypress) {
                idToken = 'testing';
            } else {
                try {
                    idToken = getToken(args);
                } catch {
                    callSnackbar(`Looks like we couldn't get a token for that ${capitalizeFirstLetter(type)} account. Try again?`, 'error');

                    return;
                }
            }

            connectSocialAccountMutation({ variables: { provider: type, idToken } })
                .then((data) => {
                    if (data?.data?.connectSocialAccount) {
                        callSnackbar(`${capitalizeFirstLetter(type)} account connected.`, 'success');
                    } else {
                        callSnackbar(
                            `Looks like that ${capitalizeFirstLetter(type)} account couldn't be connected. Try a different one?`,
                            'error'
                        );
                    }
                })
                .catch(({ ...err }) => {
                    callSnackbar(err, 'error');
                });
        };
    };

    const handClickForTesting = async () => {
        if (window?.Cypress) {
            await connectSocialAccount(() => null)();
        }
    };

    let button;

    switch (type) {
        case UserAssociatedLoginType.GOOGLE:
            button = (
                <GoogleLoginButton callback={connectSocialAccount((args) => args[0].credential)} clickListener={handClickForTesting} />
            );
            if (!isAccountLinked) break;

        case UserAssociatedLoginType.MICROSOFT:
            button = <MicrosoftLoginButton callback={connectSocialAccount((args) => args[1].idToken)} />;
            if (!isAccountLinked) break;

        default:
            button = (
                <LWPButton
                    btnText={btnText}
                    loading={getGoogleLoginUrlLoading || getMicrosoftAzureADLoginUrlLoading}
                    disabled={getGoogleLoginUrlLoading || getMicrosoftAzureADLoginUrlLoading}
                    onClick={() => btnHandler(isAccountLinked)}
                    color={btnColor}
                    startIcon={btnIcon}
                    style={{ width: '215px' }}
                />
            );
    }

    if (connectSocialAccountLoading) return <CommonLoading />;

    return (
        <div className="login-option-wrapper">
            <Paper>
                <div className="login-option-social-detail">
                    <div className="login-option-social-text">
                        <div className="login-option-social-image">
                            <img
                                src={
                                    type === UserAssociatedLoginType.PASSWORD
                                        ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lwp_social_logo1.svg`
                                        : type === UserAssociatedLoginType.MICROSOFT
                                          ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/microsoftLogo.svg`
                                          : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/googleLogo.svg`
                                }
                            />
                        </div>
                        <div className="login-option-social-user-detail">
                            {socialAccount?.accountId ? (
                                <>
                                    <Heading3 text={headingText} customClass="userName" />
                                    <Paragraph text={socialAccount?.email} customClass="userEmail" />
                                </>
                            ) : (
                                <>
                                    <Heading3 text={headingText} customClass="userName" />
                                </>
                            )}
                        </div>
                    </div>
                    {picture && <img src={picture} className="social-picture" />}
                </div>
                <div className="login-option-button">{button}</div>
            </Paper>
            {openDisconnectAccountConfirmationModal && (
                <DisconnectConfirmationModal
                    open={openDisconnectAccountConfirmationModal}
                    onCancel={() => setOpenDisconnectAccountConfirmationModal(false)}
                    loading={disconnectSocialAccountLoading}
                    heading="Disconnect this account?"
                    btnText={'Disconnect'}
                    btnClass="disconnect-btn"
                    contentWidth="768px"
                    onConfirm={() => {
                        disconnectSocialAccountMutation({ variables: { userId, accountId: socialAccount?.accountId } })
                            .then(() => {
                                callSnackbar(`${capitalizeFirstLetter(type)} account disconnected.`, 'success');
                                setOpenDisconnectAccountConfirmationModal(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDisconnectAccountConfirmationModal(false);
                            });
                    }}>
                    <Paragraph
                        text={`Please confirm that you wish to disconnect the ${capitalizeFirstLetter(
                            type
                        )} account from your Learning with Parents account.`}
                    />
                </DisconnectConfirmationModal>
            )}
            {openCannotDisconnectSocialAccountWarning && (
                <DisconnectConfirmationModal
                    open={openCannotDisconnectSocialAccountWarning}
                    onCancel={() => setOpenCannotDisconnectSocialAccountWarning(false)}
                    heading="Cannot disconnect this account"
                    btnText={'Got it'}
                    primaryBtnColor={'inherit'}
                    contentWidth="768px"
                    cancelBtn={false}
                    onConfirm={() => {
                        setOpenCannotDisconnectSocialAccountWarning(false);
                    }}>
                    <Paragraph
                        text={'You need to have at least one login option. Please set any other log in option before disconnecting this'}
                    />
                </DisconnectConfirmationModal>
            )}
        </div>
    );
};

CommonLoginOption.propTypes = {
    userId: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    socialAccount: PropTypes.object,
    isPasswordSet: PropTypes.bool,
    picture: PropTypes.string,
    hasMoreConnectedSocialAccounts: PropTypes.bool
};

export default CommonLoginOption;
