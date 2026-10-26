import { gql, useQuery } from '@apollo/client';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../shared/Services/handler';
import CommonLoading from '../Shared/CommonLoading';
import SetPassword from './SetPassword';

// Queries

const getUserForUserPassword = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            hasPassword
        }
    }
`;

// Component

const UserPassword = () => {
    const { token, callSnackbar } = useContext(ThemeContext);
    const {
        loading,
        error,
        data: userData
    } = useQuery(getUserForUserPassword, { variables: { id: token?.sub }, fetchPolicy: 'cache-first' });

    useEffect(() => {
        error?.message && callSnackbar(error?.message, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    return (
        <div className="user-password-wrapper">
            <SetPassword userId={token?.sub} userType={token?.userType} hasPassword={userData?.getUser?.hasPassword} />
        </div>
    );
};

export default UserPassword;
