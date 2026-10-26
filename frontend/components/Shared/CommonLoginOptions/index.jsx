import { gql, useQuery } from '@apollo/client';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { UserAssociatedLoginType } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../CommonLoading';
import CommonLoginOption from '../CommonLoginOption';
import Heading1 from '../Typography/Heading1';

// Queries

const getUserForCommonLoginOptions = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            hasPassword
            socialAccounts {
                id
                accountId
                accountType
                email
                firstname
                lastname
                picture
            }
            socialLoginPermissions
        }
    }
`;

const CommonLoginOptions = ({ userId }) => {
    const [socialLoginPermissions, setSocialLoginPermissions] = useState({ email: null, google: null, microsoft: null });
    const { callSnackbar } = useContext(ThemeContext);

    const {
        loading,
        error,
        data: userData
    } = useQuery(getUserForCommonLoginOptions, { variables: { id: userId }, fetchPolicy: 'network-only' });

    useEffect(() => {
        if (userData?.getUser?.socialLoginPermissions) {
            setSocialLoginPermissions(JSON.parse(userData?.getUser?.socialLoginPermissions));
        }
    }, [userData]);

    useEffect(() => {
        error?.message && callSnackbar(error?.message, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="login-options-wrapper">
            <Heading1 text="Login options" customClass="login-options-heading" />

            {socialLoginPermissions.password ? (
                <CommonLoginOption userId={userId} type={UserAssociatedLoginType.PASSWORD} isPasswordSet={userData?.getUser?.hasPassword} />
            ) : null}
            {socialLoginPermissions.microsoft ? (
                <CommonLoginOption
                    userId={userId}
                    type={UserAssociatedLoginType.MICROSOFT}
                    socialAccount={(userData?.getUser?.socialAccounts || []).find(
                        (logins) => logins?.accountType === UserAssociatedLoginType.MICROSOFT
                    )}
                    hasMoreConnectedSocialAccounts={(userData?.getUser?.socialAccounts || [])?.length > 1}
                    isPasswordSet={userData?.getUser?.hasPassword}
                />
            ) : null}
            {socialLoginPermissions.google ? (
                <CommonLoginOption
                    userId={userId}
                    type={UserAssociatedLoginType.GOOGLE}
                    socialAccount={(userData?.getUser?.socialAccounts || []).find(
                        (logins) => logins.accountType === UserAssociatedLoginType.GOOGLE
                    )}
                    hasMoreConnectedSocialAccounts={(userData?.getUser?.socialAccounts || [])?.length > 1}
                    isPasswordSet={userData?.getUser?.hasPassword}
                    picture={userData?.getUser?.socialAccounts?.[0]?.picture}
                />
            ) : null}
        </div>
    );
};

CommonLoginOptions.propTypes = { userId: PropTypes.number.isRequired };

export default CommonLoginOptions;
