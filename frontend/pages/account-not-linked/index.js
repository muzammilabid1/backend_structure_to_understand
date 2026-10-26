import { gql, useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import React, { useContext, useEffect, useState } from 'react';

import CommonSocialAccountInformation from '../../components/Shared/AccountNotLinked';
import LWPButton from '../../components/Shared/Button/LWPButton';
import Heading1 from '../../components/Shared/Typography/Heading1';
import Paragraph from '../../components/Shared/Typography/Paragraph';
import { getCookie, getJwtDecoded, removeCookie, setCookies } from '../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, MINIO_PUBLIC_PATHS, PARENT, REFRESH_TOKEN_COOKIE, UserAssociatedLoginType } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import { PageType } from '../../types/enums/PageType';

const linkSocialAccountWithLwpAccount = gql`
    mutation linkSocialAccountWithLwpAccount($jwt: String!) {
        linkSocialAccountWithLwpAccount(jwt: $jwt)
    }
`;

const AccountNotLinked = () => {
    const router = useRouter();
    const { callSnackbar, token } = useContext(ThemeContext);

    const [accountInfo, setAccountInfo] = useState(null);
    const [socialLoginJwt, setSocialLoginJwt] = useState('');

    useEffect(() => {
        const jwt = getCookie('details');

        if (jwt) {
            const accountDetails = getJwtDecoded(jwt);

            setAccountInfo(accountDetails);
            setSocialLoginJwt(jwt);
        }
    }, []);

    const [linkSocialAccountWithLwpAccountMutation, { loading }] = useMutation(linkSocialAccountWithLwpAccount);

    return (
        <div className="account_not_linked_container">
            <Heading1 text="Do you want to link this account?" centerText />
            <div className="account_information">
                <CommonSocialAccountInformation
                    accountName={accountInfo?.socialAccountDisplayName}
                    accountEmail={accountInfo?.userEmail}
                    avatarIcon={accountInfo?.socialAccountDisplayImage}
                    socialIcon={
                        accountInfo?.socialAccountType === UserAssociatedLoginType.MICROSOFT
                            ? `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/microsoftLogo.svg`
                            : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/googleLogo.svg`
                    }
                    variant="square"
                />
                <span className="material-icons">swap_horiz</span>
                <CommonSocialAccountInformation
                    accountName={accountInfo?.lwpUserFullName}
                    accountEmail={accountInfo?.expectedEmail}
                    socialIcon={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/main-logo.png`}
                    variant="rounded"
                />
            </div>
            <Paragraph
                text={`You have logged in as ${
                    accountInfo?.userEmail
                } on ${accountInfo?.socialAccountType?.toLowerCase()}. Do you want to link this ${accountInfo?.socialAccountType?.toLowerCase()} account with your LWP account?`}
                centerText
            />
            <div className="account_not_linked_button_container">
                {token?.sub ? (
                    <LWPButton
                        onClick={() => {
                            token?.userType === PARENT ? router?.push('/settings') : router?.push('/account');
                        }}
                        btnText="Back to account details"
                        size="large"
                        color="inherit"
                    />
                ) : (
                    <LWPButton
                        onClick={() => {
                            removeCookie(ACCESS_TOKEN_COOKIE);
                            removeCookie(REFRESH_TOKEN_COOKIE);
                            removeCookie('temp_access_token');
                            removeCookie('temp_refresh_token');
                            removeCookie('details');
                            router?.push('/');
                        }}
                        btnText="Back to log in"
                        size="large"
                        color="inherit"
                    />
                )}
                <LWPButton
                    onClick={() => {
                        linkSocialAccountWithLwpAccountMutation({
                            variables: {
                                jwt: socialLoginJwt
                            }
                        })
                            .then((response) => {
                                if (response?.data?.linkSocialAccountWithLwpAccount) {
                                    const access_token = getCookie('temp_access_token');
                                    const refresh_token = getCookie('temp_refresh_token');

                                    removeCookie('temp_access_token');
                                    removeCookie('temp_refresh_token');
                                    removeCookie('details');

                                    setCookies(access_token, refresh_token);
                                    callSnackbar('Login successful!', 'success');

                                    token?.sub
                                        ? token?.userType === PARENT
                                            ? router?.push('/settings')
                                            : router?.push('/account')
                                        : router?.push('/');
                                } else {
                                    callSnackbar("Sorry! We couldn't link your accounts.", 'error');
                                }
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                            });
                    }}
                    loading={loading}
                    btnText="Link my account"
                    size="large"
                />
            </div>
        </div>
    );
};

AccountNotLinked.pageType = PageType.GENERAL;
AccountNotLinked.pageTitle = 'Account not linked';

export default AccountNotLinked;
