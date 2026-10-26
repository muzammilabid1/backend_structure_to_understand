// const SignupPage = dynamic(() => import('../Signup'));
// const ForgotPassword = dynamic(() => import('../ForgotPassword'));
// const ResetPassword = dynamic(() => import('../ResetPassword'));
import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { behaviour } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

// import { verifyEmailAndPhoneById } from '../../graphQl/mutations';
import { clearCookies, getCookie, getJwtDecoded } from '../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, HELPER, STATUS_CODES } from '../../shared/Constant';
import { useWindowSize } from '../../shared/hooks/useWindowSize';
import { isAdminViewAsMode, isViewAsMode, ThemeContext } from '../../shared/Services/handler';
import Announcements from '../Shared/Announcements';
import { TooltipProvider } from '../../context/TooltipContext';

const CommonContainer = dynamic(() => import('../Shared/CommonContainer'));
const CommonLoading = dynamic(() => import('../Shared/CommonLoading'));
const CommonSnackbar = dynamic(() => import('../Shared/CommonSnackbar'));
const Dashboard = dynamic(() => import('../Shared/Dashboard'));
const Header = dynamic(() => import('../Shared/Header'));
const NotProductionSnackbar = dynamic(() => import('../Shared/NotProductionSnackbar'));
const ViewModeLable = dynamic(() => import('../Shared/ViewModeLabel'));
const LoginPage = dynamic(() => import('../Login'));

const getServerUptime = gql`
    query getServerUptime {
        getServerUptime {
            buildType
            serverUptime
        }
    }
`;

const AuthProvider = ({ children }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [token, setToken] = useState(undefined);
    const [userAnnouncementContext, setUserAnnouncementContext] = useState(null);

    /**
     * parentPath is the path to which a "back" button should go. All back buttons throughout the application,
     * whether inside headers or components, should use the parentPath to determine their location, unless
     * there's a good reason not to. An empty parentPath indicates that no back button should be displayed,
     * because there's no sensible "back" to go, and is the default unless a component specifies a good "back".
     */
    const [parentPath, setParentPath] = useState('');

    /**
     * headerTitle contains the title that the header should display. An empty headerTitle indicates that there is
     * no title for the header to display, and is the default unless otherwise specified. A headerTitle may be set
     * without a parentPath, but where a parentPath is set, a headerTitle SHOULD also be set for consistency in the
     * user interface.
     * Note that a headerTitle MUST NOT be set unless the header needs to display a title: if both mobile and
     * desktop users are given a sensible title by the component, it MUST NOT also set a headerTitle.
     */
    const [headerTitle, setHeaderTitle] = useState('');

    /**
     * alwaysShowLiveChat will, when set to true, enable the live chat widget to always be shown for a given page,
     * even on mobile devices with small screens.
     */
    const [alwaysShowLiveChat, setAlwaysShowLiveChat] = useState(false);

    const [open, setOpen] = useState(false);
    const [openNotProductionIndicator, setOpenNotProductionIndicator] = useState(true);
    const [message, setMessage] = useState({ type: '', message: '', heading: '', promptReload: false });
    const finalPath = router?.asPath || pathname;
    // const [verifyEmailAndPhoneByIdMutation] = useMutation(verifyEmailAndPhoneById);
    const [childDetails, setChildDetails] = useState(null);
    const [isSSR, setIsSSR] = useState(true);

    const size = useWindowSize();
    const serverConnectionFailedMessage = 'Failed to connect to server';

    const callSnackbar = (object, type, heading = '', promptReload = false) => {
        let local_message = typeof object === 'string' ? object : object?.message;

        const statusCode = object?.graphQLErrors?.[0]?.extensions?.exception?.status || object?.networkError?.statusCode;
        const token = object?.graphQLErrors?.[0]?.extensions?.exception?.response?.token;

        if (local_message === 'Failed to fetch') {
            local_message = serverConnectionFailedMessage;
            window.newrelic?.noticeError(object, { caught: true, handled: false, finalPath });
        } else if (object?.graphQLErrors?.[0]?.extensions?.code === 'UNAUTHENTICATED') {
            clearCookies(router?.push, setToken);

            return;
        } else if (
            statusCode === STATUS_CODES.ACCOUNT_NOT_ACTIVE ||
            local_message === 'JsonWebTokenError' ||
            object?.lwpTokenRefreshError
        ) {
            clearCookies(router?.push, setToken);
            window.newrelic?.noticeError(object, { caught: true, handled: false });
            callSnackbar(statusCode === STATUS_CODES.ACCOUNT_NOT_ACTIVE ? local_message : 'Unexpected error. Please log in again.', 'info');
        } else if (statusCode === STATUS_CODES._539 && type === 'error' && statusCode !== STATUS_CODES._403) {
            router?.push(`/signup/${token}`);

            return;
        } else if (statusCode === STATUS_CODES._536 && type === 'error' && statusCode !== STATUS_CODES._403) {
            router?.push('/check-your-email-or-phone/transferred-user');

            return;
        } else if (
            (statusCode === STATUS_CODES._537 || statusCode === STATUS_CODES._538) &&
            type === 'error' &&
            statusCode !== STATUS_CODES._403
        ) {
            router?.push('/check-your-email-or-phone/invited-user');

            return;
        } else if (statusCode === STATUS_CODES.FAILED_EMAIL && type === 'error') {
            // callSnackbar(`Error in sending email.`, 'info');
            console.log(`Error in sending email.`);
            setMessage({ type: 'error', message: 'Error in sending email.' });
            setOpen(true);

            return;
        } else if (!token && local_message === 'Authorization header not found.') {
            return;
        }

        if (local_message === 'TokenExpiredError') {
            callSnackbar('Your session has expired. Please log in again.', 'info');
            clearCookies(router?.push, setToken);
        } else {
            if (type === 'error') window.newrelic?.noticeError(object, { caught: true, handled: false, source: 'unknown' });

            if (local_message !== message?.message) {
                setMessage({ type, message: local_message, heading: heading, promptReload });
            }

            setOpen(true);
        }
    };

    const { error: serverUpTimeError, data: getServerData } = useQuery(getServerUptime);

    useEffect(() => {
        serverUpTimeError?.message && callSnackbar(serverUpTimeError, 'error');
    }, [serverUpTimeError]);

    function _getJwtToken() {
        const jwt = getCookie(ACCESS_TOKEN_COOKIE);
        let decodedToken = {};

        if (jwt) {
            decodedToken = getJwtDecoded(jwt);

            // If we have an old format token with no subject claim, logout
            if (!decodedToken?.sub) return clearCookies(router?.push, setToken);

            // if (checkTokenExpiration(decodedToken.exp)) return clearCookies(push);
            // GetUser({ variables: { id: decodedtoken?.sub } });
            // setIsLoading(false);
            // setToken(decodedToken);

            // if (checkTokenExpiration(decodedToken.exp)) {
            //     clearCookies(router?.push, setToken);
            // } else {
            setToken(decodedToken);
            // }
        } else {
            setToken(null);
        }
    }

    const goBack = () => {
        if (parentPath) {
            router?.push(parentPath);
        } else {
            console.log(`No parentPath specified, but back was called! Falling back to browser back.`);
            router?.back();
        }
    };

    useEffect(() => {
        const handleRouteChange = () => {
            // Reset parentPath and headerTitle for new "page loads"
            setParentPath('');
            setHeaderTitle('');
            setAlwaysShowLiveChat(false);
        };

        router?.events.on('beforeHistoryChange', handleRouteChange);

        // If the component is unmounted, unsubscribe
        // from the event with the `off` method:
        return () => {
            router?.events.off('beforeHistoryChange', handleRouteChange);
        };
    }, [router?.events]);

    // useEffect(() => {
    //     if (isUserQueryCalled) {
    //         setIsLoading(false);
    //     }
    // }, [isUserQueryCalled]);

    // useEffect(() => {
    //     if (token && token?.sub && searchParams.get('v')) {
    //         verifyEmailAndPhoneByIdMutation({ variables: { input: { id: token?.sub, verificationCode: searchParams.get('v') } } });
    //     }
    // }, [token]);

    useEffect(() => {
        if (size.width <= 768 && !alwaysShowLiveChat) {
            const hubspotContainer = document.getElementById('hubspot-messages-iframe-container');
            const hubspotWidget = window?.HubSpotConversations?.widget;
            const shadow = document.getElementsByClassName('hs-shadow-container');

            if (hubspotWidget) {
                if (!shadow?.[0]?.className?.includes('active')) {
                    hubspotContainer?.classList.add('hide_widget');
                }
            } else {
                window.hsConversationsSettings = { loadImmediately: false };
            }
        }

        if (size.width > 768 || alwaysShowLiveChat) {
            if (window?.HubSpotConversations?.widget) {
                window.HubSpotConversations.widget.load();
            } else {
                window.hsConversationsSettings = { loadImmediately: true };
            }
        }
    }, [size, alwaysShowLiveChat]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            // the version of JS currently running on Vercel doesn't support ||= :(
            window.hsConversationsSettings = window.hsConversationsSettings ?? { loadImmediately: false };
        }
    }, []);

    const isUnAuthenticatedComponent = () => {
        const finalPath = router?.asPath || pathname;

        return (
            finalPath.startsWith('/signup') ||
            finalPath.startsWith('/reject-invitation') ||
            finalPath.startsWith('/registeremail') ||
            finalPath.startsWith('/forgot') ||
            finalPath.startsWith('/reset') ||
            finalPath.startsWith('/new') ||
            finalPath.startsWith('/check-your-email-or-phone') ||
            finalPath.startsWith('/activitydemo') ||
            finalPath.startsWith('/topicdemo') ||
            finalPath.startsWith('/previewtopic') ||
            finalPath.startsWith('/schoolsignup') ||
            finalPath.startsWith('/addchild') ||
            finalPath.startsWith('/faqs') ||
            finalPath.startsWith('/magic') ||
            finalPath.startsWith('/child-rejected') ||
            finalPath.startsWith('/previewactivity') ||
            finalPath.startsWith('/auth') ||
            finalPath.startsWith('/account-not-found') ||
            finalPath.startsWith('/account-not-linked') ||
            finalPath.startsWith('/cannot-link-account') ||
            finalPath.startsWith('/impact-report') ||
            finalPath.startsWith('/wrong-account')
        );
    };

    useEffect(() => {
        _getJwtToken();
    }, [router?.asPath]);

    useEffect(() => {
        setIsSSR(false);
    }, []);

    const messageShouldReload = () => {
        return message?.promptReload || (message?.message === serverConnectionFailedMessage && message?.type === 'error');
    };

    const renderContent = () => {
        if (message.message === 'Unexpected error' || isSSR) {
            return <CommonLoading />;
        } else if (isUnAuthenticatedComponent()) {
            return (
                <CommonContainer className="auth_container">
                    {!finalPath.startsWith('/previewtopic') && !finalPath.startsWith('/previewactivity') && (
                        <Header headerTitle={headerTitle} parentPath={parentPath} />
                    )}
                    <div className="my24">{children}</div>
                </CommonContainer>
            );
        } else if (!token) {
            return (
                <CommonContainer className="auth_container">
                    <Header />
                    <div className="my24">
                        <Announcements route={behaviour.announcementPages.LOGIN_SCREEN_ROUTE} />
                        <LoginPage />
                    </div>
                </CommonContainer>
            );
        } else if (token.userType === 'TEACHER' || token.userType === 'ADMIN') {
            return <Dashboard>{children}</Dashboard>;
        } else {
            return (
                <div>
                    {token.userType !== 'HELPER' && (
                        <Header parentName={`${token.firstName} ${token.lastName}`} headerTitle={headerTitle} parentPath={parentPath} />
                    )}
                    <CommonContainer>
                        <div className="my24">{children}</div>
                    </CommonContainer>
                </div>
            );
        }
    };

    return (
        <ThemeContext.Provider
            value={{
                userId: token?.sub,
                message: message.message,
                token,
                setToken,
                setHeaderTitle,
                callSnackbar,
                childDetails,
                setChildDetails,
                parentPath,
                setParentPath,
                setAlwaysShowLiveChat,
                goBack,
                userAnnouncementContext,
                setUserAnnouncementContext
            }}>
            <TooltipProvider>
                {open && (
                    <CommonSnackbar
                        message={message?.message}
                        type={message?.type}
                        open={open}
                        heading={message?.heading}
                        primaryBtnText={messageShouldReload() ? 'Reload' : 'Dismiss'}
                        onClose={messageShouldReload() ? () => window.location.reload() : () => setOpen(!open)}
                    />
                )}
                {getServerData?.['getServerUptime']?.buildType &&
                    getServerData?.['getServerUptime']?.serverUptime &&
                    (getServerData?.['getServerUptime']?.buildType === 'stage' ||
                        getServerData?.['getServerUptime']?.buildType === 'dev') && (
                        <NotProductionSnackbar
                            setOpenNotProductionIndicator={setOpenNotProductionIndicator}
                            openNotProductionIndicator={openNotProductionIndicator}
                            message={`${getServerData?.['getServerUptime']?.buildType?.toUpperCase()} : Server Up-Time : ${
                                getServerData?.['getServerUptime']?.serverUptime
                            }`}
                        />
                    )}

                {/* {user?.['getUser']?.school?.curentPeriod && !user?.['getUser']?.school?.curentPeriod?.isCurrentPeriod && (
                <>
                    <ViewModeLable isAcademic={true} schoolCurrentPeriod={user?.['getUser']?.school?.curentPeriod} />
                </>
            )} */}

                {isViewAsMode(token?.userType, pathname) && (
                    <>
                        <ViewModeLable />
                        <Header
                            parentName={`${token?.firstname} ${token?.lastname}`}
                            headerTitle={headerTitle}
                            parentPath={parentPath}
                            className={'mt12'}
                        />
                    </>
                )}

                {isAdminViewAsMode(token?.userType, pathname) && <ViewModeLable />}

                {token?.userType === HELPER && <ViewModeLable />}

                {renderContent()}
            </TooltipProvider>
        </ThemeContext.Provider>
    );
};

export const useLwpAppContext = () => {
    return useContext(ThemeContext);
};

AuthProvider.propTypes = { children: PropTypes.element };

export default AuthProvider;
