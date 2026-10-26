/* eslint-disable @next/next/no-img-element */
import { gql, useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Menu } from '@mui/icons-material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { AppBar, Badge, Divider, IconButton, Toolbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { FeatureTooltipTargets } from 'lwp-shared';
import { useRouter } from 'next/compat/router';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { logout, reInviteParent } from '../../../graphQl/mutations';
import { clearCookies, clearCookiesOnly, getCookie } from '../../../lib/manageCookies';
import {
    ACCESS_TOKEN_COOKIE,
    MAGICPARENT,
    MINIO_PUBLIC_PATHS,
    PARENT,
    REFRESH_TOKEN_COOKIE,
    TEACHER,
    TOPICACCESS
} from '../../../shared/Constant';
import { renderPupilImg, ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../Button/LWPButton';
import CommonContainer from '../CommonContainer';
import CommonListWithIcon from '../CommonListWithIcon';
import CommonPopOver from '../CommonPopOver';
import CommonPupilList from '../CommonPupilList';
import LoginOrSignUpModal from '../Modals/LoginOrSignUpModal';
import SideDrawer from '../SideDrawer';
import Heading2 from '../Typography/Heading2';
import Paragraph from '../Typography/Paragraph';
import UserAnnouncementsDrawer from '../UserAnnouncementsDrawer';

const getPupils = gql`
    query getPupils($parentId: String!, $isActiveInCurrentAcademic: Boolean) {
        getPupils(parentId: $parentId, isActiveInCurrentAcademic: $isActiveInCurrentAcademic) {
            id
            fullname
            firstname
            type
            currentClassOrGroupAcrossClasses {
                isFullProgramme
                IsReadingLogsEnabled
                isReadyTeddyEnabled
                isPreAdmissionClass
            }
            getSchoolSponsorProgram {
                logoUrl
            }
            currentMathscot {
                character
                colour
            }
            mathscotUrl {
                thumbnailImage
            }
        }
    }
`;

const getPupil = gql`
    query pupil($id: String) {
        pupil(id: $id) {
            id
            fullname
            firstname
            type
            getSchoolSponsorProgram {
                logoUrl
            }
            currentMathscot {
                character
                colour
            }
            mathscotUrl {
                thumbnailImage
            }
        }
    }
`;

const Header = ({ parentName, headerTitle = '', className, parentPath = '' }) => {
    const theme = useTheme();
    const smBkptOrUp = useMediaQuery(theme.breakpoints.up('sm'));
    const queryParams = useParams();
    const router = useRouter();
    const pathname = router?.pathname || router?.route;
    const { setToken, callSnackbar, childDetails, token, goBack, userAnnouncementContext } = useContext(ThemeContext);
    const client = useApolloClient();

    const [mobileScreen, setMobileScreen] = useState(false);
    const [hubSpotOptions, setHubSpotOptions] = useState({ show: false, count: 0 });
    const [isAccountSettings, setIsAccountSettings] = useState(true);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
    const [check, setCheck] = useState(false);

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });
    const [reInviteParentMutation] = useMutation(reInviteParent);

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // const [isAppInstalled, setIsAppInstalled] = useState(false);
    // const [deferredPrompt, setDeferredPrompt] = useState(null);
    // const matches = useMediaQuery(theme.breakpoints.down('md'));

    const pupilId = queryParams?.child_id || queryParams?.pupil_id || childDetails?.id || token?.pupilId;

    const notAllowToViewPupils = !['/settings', '/parent-faqs', '/parent/[user_id]', '/', '/welcome/[pupilParentId]'].includes(pathname);

    const { data: pupils } = useQuery(getPupils, {
        variables: { parentId: token?.sub, isActiveInCurrentAcademic: true },
        fetchPolicy: 'cache-first',
        skip: !([PARENT, MAGICPARENT, TOPICACCESS].includes(token?.userType) && notAllowToViewPupils)
    });

    const { data: pupil } = useQuery(getPupil, {
        variables: { id: pupilId },
        fetchPolicy: 'cache-first',
        skip: !(token?.userType === TEACHER && pupilId)
    });

    const rearrangedPupils = pupils?.getPupils
        ? (pupils?.getPupils ?? [])?.reduce((acc, pupil) => {
              if (pupil.id === pupilId) {
                  acc.unshift(pupil);
              } else {
                  acc.push(pupil);
              }

              return acc;
          }, [])
        : pupil?.pupil
          ? [{ ...pupil?.pupil }]
          : [];

    if (!pupils?.getPupils?.some((pupil) => pupil?.id == pupilId) && token?.userType === PARENT) {
        if (childDetails) {
            rearrangedPupils.unshift({ ...childDetails });
        }
    }

    const openChat = () => {
        if (window?.HubSpotConversations?.widget) {
            const active = document.getElementById('hubspot-messages-iframe-container');

            active && active.classList.contains('hide_widget') && active.classList.remove('hide_widget');
            window.HubSpotConversations.widget.load({ widgetOpen: true }); // no-op if already loaded
            window.HubSpotConversations.widget.open(); // no-op if already showing :)
            setHubSpotOptions({ count: 0, show: false });
            setCheck(true);
        } else {
            callSnackbar('Please update your cookie preferences to chat to us.', 'warning');
        }

        handleMobileMenuClose();
    };

    useEffect(() => {
        if (window?.HubSpotConversations?.widget && !smBkptOrUp) {
            window?.HubSpotConversations.on('widgetClosed', function () {
                const active = document.getElementById('hubspot-messages-iframe-container');

                active?.classList.add('hide_widget');
                setHubSpotOptions({ count: 0, show: false });
            });

            window.HubSpotConversations.on('unreadConversationCountChanged', (payload) => {
                setHubSpotOptions((pre) => ({ count: pre?.count + payload.unreadCount, show: true }));
            });
        }
    }, [check]);

    useEffect(() => {
        if (hubSpotOptions?.show) {
            setTimeout(() => {
                setHubSpotOptions((pre) => ({ ...pre, show: false }));
            }, [5000]);
        }
    }, [hubSpotOptions]);

    const handleActiveUser = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        clearCookiesOnly();
        setToken(null);
        client.clearStore();
        isAccountSettings ? router?.replace('/settings') : router?.replace(`/child/${pupilId}/settings`);
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

    const _onLogout = () => {
        logoutMutation()
            .then(() => {
                callSnackbar('Logged out successfully', 'success');
                clearCookies(router?.push, setToken);
                client.clearStore();
            })
            .catch(({ ...err }) => callSnackbar(err, 'error'));
    };

    const handleMobileMenuClose = () => {
        setMobileScreen(false);
        setIsPopoverOpen(false);
    };

    const handleMobileMenuOpen = (event) => {
        setMobileScreen(event.currentTarget);
        setHubSpotOptions((pre) => ({ ...pre, show: false }));
    };

    // useEffect(() => {
    //     if (typeof window !== 'undefined' && window.localStorage) {
    //         setIsAppInstalled(localStorage.getItem('install') === 'true');
    //     }

    //     window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    //     return () => {
    //         window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    //     };
    // }, []);

    // const handleBeforeInstallPrompt = (event) => {
    //     event.preventDefault();
    //     setDeferredPrompt(event);
    // };

    // const handleInstallApp = async () => {
    //     if (deferredPrompt) {
    //         deferredPrompt.prompt();
    //         const result = await deferredPrompt.userChoice;

    //         if (result.outcome === 'accepted') {
    //             console.log('User accepted the install prompt.');
    //             // Check if localStorage is available
    //             if (typeof window !== 'undefined' && window.localStorage) {
    //                 localStorage.setItem('install', 'true');
    //             }
    //         } else {
    //             console.log('User dismissed the install prompt.');
    //         }

    //         setDeferredPrompt(null);
    //     }
    // };
    const chatToUs = (
        <div style={{ display: 'flex', gap: 20 }}>
            <p>Chat to us</p>
            <div>
                {!smBkptOrUp ? (
                    <Badge badgeContent={hubSpotOptions?.count} color="primary" className="header-badge" style={{ top: -4 }} />
                ) : (
                    ''
                )}
            </div>
        </div>
    );

    const authenticatedList = [
        {
            text: 'Account settings',
            icon: 'settings',
            onClick: () => {
                setIsAccountSettings(true);
                token?.userTrustLevel < 2 ? setIsSignInModalOpen(true) : router?.push('/settings');
                handleMobileMenuClose();
            },
            dataTest: 'burger-menu-item-account-settings-btn'
        },
        // {
        //     text: 'Child details',
        //     icon: 'edit',
        //     onClick: () => {
        //         setIsAccountSettings(false);
        //         token?.userTrustLevel < 2 ? setIsSignInModalOpen(true) : router?.push(`/child/${pupilId}/settings`);
        //         handleMobileMenuClose();
        //     }
        // },
        {
            text: 'FAQs',
            icon: 'help_outline',
            onClick: () => {
                router?.push('/parent-faqs');
                handleMobileMenuClose();
            }
        },
        {
            text: 'Parent FAQs',
            icon: 'help_outline',
            onClick: () => {
                router?.push('/parent-faqs');
                handleMobileMenuClose();
            }
        },
        {
            text: chatToUs,
            icon: 'chat_bubble_outline',
            onClick: openChat
        },
        {
            text: 'Cookie settings',
            icon: 'cookie',
            onClick: () => {
                if (window?.CookieFirst) {
                    window.CookieFirst.openPanel();
                }

                handleMobileMenuClose();
            }
        },
        // ...(!isAppInstalled && matches && !localStorage.getItem('install')
        //     ? [
        //           {
        //               text: (
        //                   <Paragraph>
        //                       Add shortcut to <br /> home screen
        //                   </Paragraph>
        //               ),
        //               icon: 'add',
        //               onClick: handleInstallApp
        //           }
        //       ]
        //     : []),
        {
            text: 'Sign out',
            icon: 'login',
            dataTest: 'parent-popover-list-sign-out',
            onClick: () => {
                _onLogout();
                handleMobileMenuClose();
            }
        },
        {
            text: 'Exit parent view',
            icon: 'login',
            onClick: () => {
                router?.push(`/pupil/${childDetails?.id}`);
            }
        }
    ];

    const unAuthenticatedList = [
        {
            text: 'FAQs',
            icon: 'help_outline',
            onClick: () => {
                router?.push('/faqs');
                handleMobileMenuClose();
            }
        },
        {
            text: chatToUs,
            icon: 'chat_bubble_outline',
            onClick: openChat
        },
        {
            text: 'Cookie settings',
            icon: 'cookie',
            onClick: () => {
                if (window?.CookieFirst) {
                    window.CookieFirst.openPanel();
                }

                handleMobileMenuClose();
            }
        }
    ];

    const staticSiteList = [
        {
            text: 'Parent',
            icon: 'family_restroom',
            onClick: () => {
                router?.push('/static/parents');
                handleMobileMenuClose();
            }
        },
        {
            text: 'Teachers',
            // icon: 'help_outline',
            onClick: () => {
                router?.push('/static/teachers');
                handleMobileMenuClose();
            }
        },
        {
            text: 'About',
            icon: 'error_outline',
            onClick: () => {
                router?.push('/static/about');
                handleMobileMenuClose();
            }
        },
        {
            text: 'Log in',
            icon: 'login',
            onClick: () => {
                router?.push('/');
                handleMobileMenuClose();
            }
        },
        {
            text: chatToUs,
            icon: 'chat_bubble_outline',
            onClick: openChat
        },
        {
            text: 'Cookie settings',
            icon: 'cookie',
            onClick: () => {
                if (window?.CookieFirst) {
                    window.CookieFirst.openPanel();
                }

                handleMobileMenuClose();
            }
        }
    ];

    const mobileMenuId = 'primary-search-account-menu-mobile';

    const renderMobileMenu = (
        <SideDrawer open={mobileScreen} onClose={handleMobileMenuClose} onOpen={() => setMobileScreen(true)} padding={0}>
            <div>
                {notAllowToViewPupils ? (
                    <CommonPupilList
                        pupils={rearrangedPupils}
                        handleMobileMenuClose={handleMobileMenuClose}
                        setIsSignInModalOpen={setIsSignInModalOpen}
                        setIsAccountSettings={setIsAccountSettings}
                    />
                ) : (
                    ''
                )}
                <div style={{ paddingBottom: '6em' }}>
                    {token?.sub ? <Heading2 text={parentName} style={{ padding: '8px 20px 0px', margin: 0 }} /> : null}
                    <CommonListWithIcon
                        list={pathname.startsWith('/static') ? staticSiteList : token?.sub ? authenticatedList : unAuthenticatedList}
                    />
                </div>
            </div>
        </SideDrawer>
    );

    const shouldShowBackButton = () => !smBkptOrUp && !!parentPath;

    const routeOnCondition = () => {
        const token = getCookie(ACCESS_TOKEN_COOKIE);

        if (
            token ||
            pathname === '/forgot-password' ||
            pathname === '/signup' ||
            pathname === '/signup[token]' ||
            pathname === '/reset-password[token]'
        ) {
            router?.push('/');
        } else {
            router?.push('https://learningwithparents.com/');
        }
    };

    const currentPupil = rearrangedPupils?.find((x) => x?.id === pupilId)
        ? rearrangedPupils?.find((x) => x.id === pupilId)
        : rearrangedPupils.length > 0
          ? rearrangedPupils[0]
          : null;

    const corporateBrandLogo = notAllowToViewPupils && currentPupil ? currentPupil?.getSchoolSponsorProgram?.logoUrl : null;

    return (
        <div className={`header-container header-spacing`}>
            <AppBar position="fixed" className={className}>
                <CommonContainer>
                    <Toolbar disableGutters className="header-section">
                        {shouldShowBackButton() ? (
                            <div className="mobile-btn">
                                <LWPButton
                                    btnText={headerTitle}
                                    customClass="back-btn"
                                    startIcon="arrow_back"
                                    color="inherit"
                                    variant="text"
                                    size="large"
                                    onClick={goBack}
                                />
                            </div>
                        ) : (
                            <div className="logo-with-heading">
                                {corporateBrandLogo ? (
                                    <span className="brand-logo">
                                        <img src={corporateBrandLogo} alt="corporate branding logo" />
                                        <Divider orientation="vertical" variant="middle" flexItem />
                                    </span>
                                ) : null}

                                <IconButton edge="start" color="inherit" aria-label="open drawer" onClick={routeOnCondition} size="large">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/main-logo.png`}
                                        alt="The Learning with Parents logo."
                                        data-test="header-logo"
                                    />
                                </IconButton>
                                {!!headerTitle && <h1 className="heading-one">{headerTitle}</h1>}
                            </div>
                        )}
                        <div className="header-spacing" />
                        {pathname.startsWith('/static') && (
                            <>
                                <ul className="unorder_list section-desktop">
                                    <li>
                                        <Link passHref href="/static/parents">
                                            Parents
                                        </Link>
                                    </li>
                                    <li>
                                        <Link passHref href="/static/teachers">
                                            Teachers
                                        </Link>
                                    </li>
                                    <li>
                                        <Link passHref href="/static/about">
                                            About
                                        </Link>
                                    </li>
                                    <li>
                                        <LWPButton btnText="Log in" onClick={() => router?.push('/')} />
                                    </li>
                                </ul>
                                <div className="section-mobile">
                                    <IconButton
                                        aria-label="show more"
                                        aria-controls={mobileMenuId}
                                        aria-haspopup="true"
                                        onClick={handleMobileMenuOpen}
                                        color="inherit"
                                        size="large">
                                        <Menu />
                                    </IconButton>
                                </div>
                            </>
                        )}
                        {!pathname.startsWith('/static') && (
                            <>
                                {!isMobile && (
                                    <div className="section-desktop show_pupil">
                                        {notAllowToViewPupils && !!rearrangedPupils?.length ? (
                                            <>
                                                <CommonPopOver
                                                    childrenClass="pupil_list_popover"
                                                    element={
                                                        <div
                                                            id={
                                                                rearrangedPupils?.length > 1
                                                                    ? FeatureTooltipTargets.CHILD_SWITCH
                                                                    : 'pupil-tab-container'
                                                            }
                                                            className="pupil_tab_container"
                                                            data-test="switch-child-tab">
                                                            {<img src={renderPupilImg(currentPupil)} width={24} height={24} />}
                                                            {currentPupil?.firstname}
                                                            <KeyboardArrowDownIcon style={{ marginLeft: 10 }} />
                                                        </div>
                                                    }>
                                                    <CommonPupilList
                                                        pupils={rearrangedPupils}
                                                        handleMobileMenuClose={handleMobileMenuClose}
                                                        setIsSignInModalOpen={setIsSignInModalOpen}
                                                        setIsAccountSettings={setIsAccountSettings}
                                                    />
                                                </CommonPopOver>
                                            </>
                                        ) : (
                                            ''
                                        )}

                                        {userAnnouncementContext?.hasAnnouncements ? <UserAnnouncementsDrawer /> : null}
                                        <div className="show_settings">
                                            {token?.sub ? <Paragraph text={`${token?.firstName} ${token?.lastName}`} /> : null}
                                            <CommonPopOver
                                                icon="menu"
                                                dataTest="parent-popover-list-menu-icon"
                                                iconClassName="ml2"
                                                isOpen={isPopoverOpen}
                                                setIsOpen={setIsPopoverOpen}>
                                                <CommonListWithIcon
                                                    dataTest={'burger-menu-desktop'}
                                                    list={token?.sub ? authenticatedList : unAuthenticatedList}
                                                />
                                            </CommonPopOver>
                                        </div>
                                    </div>
                                )}

                                <div className="section-mobile">
                                    {userAnnouncementContext?.hasAnnouncements ? <UserAnnouncementsDrawer /> : null}
                                    <IconButton
                                        aria-label="show more"
                                        aria-controls={mobileMenuId}
                                        aria-haspopup="true"
                                        onClick={handleMobileMenuOpen}
                                        color="inherit"
                                        size="large">
                                        {token?.sub && notAllowToViewPupils ? (
                                            <div
                                                id={rearrangedPupils?.length > 1 ? FeatureTooltipTargets.CHILD_SWITCH : 'show-more'}
                                                className="show_more">
                                                <Paragraph text={`${rearrangedPupils?.length > 0 ? currentPupil?.firstname : ''}`} />
                                                <Badge badgeContent={hubSpotOptions?.count} color="primary" className="header-badge">
                                                    {hubSpotOptions?.show ? (
                                                        <img
                                                            src="/assets/video/notification_animation.gif"
                                                            alt="notification_animation"
                                                            width={24}
                                                            height={24}
                                                        />
                                                    ) : (
                                                        <Menu />
                                                    )}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <Badge badgeContent={hubSpotOptions?.count} color="primary" className="header-badge">
                                                {hubSpotOptions?.show ? (
                                                    <img
                                                        src="/assets/video/notification_animation.gif"
                                                        alt="notification_animation"
                                                        width={40}
                                                    />
                                                ) : (
                                                    <Menu />
                                                )}
                                            </Badge>
                                        )}
                                    </IconButton>
                                </div>
                            </>
                        )}
                        {/* {pathname.startsWith('/static') && (
                            <div className="section-mobile">
                                <IconButton
                                    aria-label="show more"
                                    aria-controls={mobileMenuId}
                                    aria-haspopup="true"
                                    onClick={handleMobileMenuOpen}
                                    color="inherit">
                                    <Menu />
                                </IconButton>
                            </div>
                        )} */}
                    </Toolbar>
                </CommonContainer>
            </AppBar>
            {isSignInModalOpen && (
                <LoginOrSignUpModal
                    open={isSignInModalOpen}
                    setOpen={() => setIsSignInModalOpen(false)}
                    heading={`${token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'} to access this section`}
                    subHeading={`Please ${token?.status === 'ACTIVE' ? 'log in' : 'sign up'} to access ${
                        isAccountSettings ? 'your account settings' : 'child details section'
                    }`}
                    primaryBtnText={token?.status === 'ACTIVE' ? 'Log in' : 'Sign up'}
                    primaryBtnHandler={() =>
                        token?.status === 'ACTIVE'
                            ? handleActiveUser()
                            : handleInvitedUser(token.sub, token?.email ? 'email' : 'number', token?.email || token?.phoneNumber)
                    }
                />
            )}
            {renderMobileMenu}
        </div>
    );
};

Header.propTypes = {
    parentName: PropTypes.string.isRequired,
    headerTitle: PropTypes.string,
    className: PropTypes.string,
    parentPath: PropTypes.string
};

Header.defaultProps = {
    parentName: 'Parent Name'
};

export default Header;
