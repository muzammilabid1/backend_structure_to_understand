import { useMutation } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import React, { useEffect } from 'react';
import { useContext } from 'react';

import { logout } from '../../graphQl/mutations';
import { clearCookies, getCookie } from '../../lib/manageCookies';
import { ThemeContext } from '../../shared/Services/handler';
import CommonLoading from '../Shared/CommonLoading';
import { REFRESH_TOKEN_COOKIE } from '../../shared/Constant';

const Logout = () => {
    const { token, setToken, callSnackbar } = useContext(ThemeContext);
    const router = useRouter();
    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });

    useEffect(() => {
        if (token) {
            if (getCookie(REFRESH_TOKEN_COOKIE)) {
                logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
            }

            clearCookies(router?.push, setToken);
        } else {
            router?.push('/');
        }
    }, [token]);

    return <CommonLoading />;
};

export default Logout;
