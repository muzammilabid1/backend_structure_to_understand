/* eslint-disable @next/next/no-img-element */
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Breadcrumbs, Link } from '@mui/material';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { logout, reInviteParent } from '../../../graphQl/mutations';
import { haveMoreChildren } from '../../../graphQl/queries';
import { clearCookies, getCookie } from '../../../lib/manageCookies';
import { ADMIN, MINIO_PUBLIC_PATHS, REFRESH_TOKEN_COOKIE } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LoginOrSignUpModal from '../../Shared/Modals/LoginOrSignUpModal';

const Breadcrumb = ({ breadcrumbLists, customClass, allowOnAdmin = false }) => {
    const { token, callSnackbar, setToken } = useContext(ThemeContext);
    const router = useRouter();
    const client = useApolloClient();

    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);
    const [haveMoreChildrenQuery, { error: haveMoreChildrenError, data: haveMoreChildrenData }] = useLazyQuery(haveMoreChildren);

    useEffect(() => {
        haveMoreChildrenError?.message && callSnackbar(haveMoreChildrenError, 'error');
    }, [haveMoreChildrenError]);

    useEffect(() => {
        if (token?.userTrustLevel < 2) {
            haveMoreChildrenQuery();
        }
    }, []);

    const modalHandler = (item) => {
        if (item?.homeIcon && token?.userTrustLevel < 2 && token?.pupilId) {
            if (haveMoreChildrenData?.haveMoreChildren) {
                setIsSignInModalOpen(true);
            } else {
                router?.push(`/child/${token?.pupilId}`);
            }
        }
    };

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookies(router?.replace, setToken);
        client.clearStore();
    };

    const handleInvitedUser = (userId, source_type, source) => {
        reInviteParentMutation({ variables: { parentId: userId } });
        router?.replace({
            pathname: '/check-your-email-or-phone/invited-user',
            query: {
                source,
                source_type
            }
        });
    };

    return (
        <>
            {allowOnAdmin || token?.userType !== ADMIN ? (
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" className="breadcrumbs-icon" />}
                    className={`breadcrumb-item ${customClass ? customClass : ''}`}>
                    {breadcrumbLists.map((item, key) => {
                        return (
                            <div onClick={() => modalHandler(item)}>
                                <Link
                                    passHref
                                    classes={{ root: 'breadcrumb-link-text' }}
                                    key={key}
                                    data-test={`breadcrumb-link`}
                                    color="textPrimary"
                                    onClick={() => router?.push(item['homeIcon'] && !item['route'] ? '/' : item['route'])}>
                                    {item['homeIcon'] ? (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/home.png`}
                                            alt="Home icon"
                                            className="svg-iocn"
                                        />
                                    ) : (
                                        ''
                                    )}
                                    {item['label']}
                                </Link>
                            </div>
                        );
                    })}
                </Breadcrumbs>
            ) : (
                <span />
            )}
            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to view your other children`}
                    subHeading={`Please ${
                        token?.status === 'ACTIVE' ? 'log in' : 'sign up'
                    } to your account to view and access your other children`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={() =>
                        token?.status === 'ACTIVE'
                            ? handleActiveUser()
                            : handleInvitedUser(token.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber)
                    }
                />
            )}
        </>
    );
};

Breadcrumb.propTypes = {
    breadcrumbLists: PropTypes.array.isRequired,
    customClass: PropTypes.string,
    allowOnAdmin: PropTypes.bool
};

export default Breadcrumb;
