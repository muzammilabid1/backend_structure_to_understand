/* eslint-disable @next/next/no-img-element */

import { gql, useLazyQuery } from '@apollo/client';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { getCookie } from '../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, MINIO_PUBLIC_PATHS } from '../../shared/Constant';
import { ThemeContext } from '../../shared/Services/handler';
import CommonCard from '../Shared/Cards/CommonCard';
import CommonLoading from '../Shared/CommonLoading';
import RenderHtml from '../Shared/CommonRenderHtml';
import CommonStatus from '../Shared/CommonStatus';
import Heading1 from '../Shared/Typography/Heading1';
import LoginWithEmailPasswordForm from './LoginWithEmailPasswordForm';
import PreLoginWithEmailAddress from './PreLoginWithEmailAddress';

// Queries
const getParametersForLoginPage = gql`
    query getParameters($keys: [String!]!) {
        getParameters(keys: $keys) {
            key
            value
            logCreatedAt
            logUpdatedAt
        }
    }
`;

// Component
const LoginPage = ({ logo, schoolName }) => {
    const { callSnackbar, setAlwaysShowLiveChat } = useContext(ThemeContext);
    const theme = useTheme();
    const matches = useMediaQuery(theme.breakpoints.down('md'));

    const [preLoginOutput, setPreLoginOutput] = useState(null);
    const [enteredEmail, setEnteredEmail] = useState(null);
    const [loading, setLoading] = useState(true);

    const [getAllParametersQuery, { loading: getParametersLoading, error: error, data: parameters }] = useLazyQuery(
        getParametersForLoginPage,
        { variables: { keys: ['LOGIN_PAGE_MSG_TITLE', 'LOGIN_PAGE_MSG'] } }
    );

    const jwt = getCookie(ACCESS_TOKEN_COOKIE);

    useEffect(() => {
        if (!jwt) {
            getAllParametersQuery();
        }

        if (loading) {
            setLoading(false);
        }
    }, [jwt]);

    // Always show live chat on the login page
    useEffect(() => setAlwaysShowLiveChat(true));

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (getParametersLoading || loading) return <CommonLoading />;

    return (
        <div className="login-page-container">
            {!schoolName &&
            parameters?.getParameters?.filter((p) => p?.key === 'LOGIN_PAGE_MSG_TITLE' && p?.value && p?.value !== '{}').length &&
            parameters?.getParameters?.filter((p) => p?.key === 'LOGIN_PAGE_MSG' && p?.value && p?.value !== '{}').length ? (
                <Grid container spacing={2} xs={12} sm={10} className="error_card_container">
                    <CommonCard cardContentClassName="card">
                        <div className="login-page-parameter-container">
                            <div className="login-page-parameter-login-image">
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`}
                                />
                                {matches && (
                                    <RenderHtml
                                        className="heading"
                                        text={parameters?.getParameters?.filter((p) => p.key === 'LOGIN_PAGE_MSG_TITLE')[0]?.value}
                                    />
                                )}
                            </div>
                            <div className="login-page-parameter-login-text">
                                {!matches && (
                                    <RenderHtml
                                        className="heading"
                                        text={parameters?.getParameters?.filter((p) => p.key === 'LOGIN_PAGE_MSG_TITLE')[0]?.value}
                                    />
                                )}
                                <RenderHtml
                                    className="para"
                                    text={parameters?.getParameters?.filter((p) => p.key === 'LOGIN_PAGE_MSG')[0]?.value}
                                />
                            </div>
                        </div>
                    </CommonCard>
                </Grid>
            ) : null}
            {parameters?.getParameters?.filter((p) => p?.key === 'LOGIN_PAGE_MSG_TITLE' && p?.value && p?.value !== '{}').length &&
            parameters?.getParameters?.filter((p) => p?.key === 'LOGIN_PAGE_MSG' && p?.value && p?.value !== '{}').length ? (
                <Heading1 text="Log in" customClass="login-page-parameter-login" />
            ) : (
                <CommonStatus heading={'Log in'} subHeading={schoolName} image={logo} imageAlt={''} />
            )}
            {!preLoginOutput?.emailOrPhone ? (
                <PreLoginWithEmailAddress
                    setPreLoginOutput={setPreLoginOutput}
                    setEnteredEmail={setEnteredEmail}
                    enteredEmail={enteredEmail}
                />
            ) : (
                <LoginWithEmailPasswordForm
                    emailOrPhone={preLoginOutput?.emailOrPhone}
                    methods={preLoginOutput?.methods}
                    setPreLoginOutput={setPreLoginOutput}
                    setEnteredEmail={setEnteredEmail}
                />
            )}
        </div>
    );
};

LoginPage.propTypes = {
    logo: PropTypes.string,
    schoolName: PropTypes.string
};
LoginPage.defaultProps = {
    logo: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`,
    schoolName: ''
};

export default LoginPage;
