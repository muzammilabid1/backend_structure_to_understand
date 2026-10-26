/* eslint-disable @next/next/no-img-element */
import { useApolloClient, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import MenuIcon from '@mui/icons-material/Menu';
import { Container, Drawer, Grid, IconButton, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/styles';
import { useRouter } from 'next/compat/router';
import { usePathname } from 'next/navigation';
import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';

import { useDelegatedClaimsSubscriber } from '../../../context/DelegatedClaimsContext';
import { logout } from '../../../graphQl/mutations';
import {
    getGroupsAcrossClasses,
    getPreAdmissionClasses,
    getSchoolClassesAndGroups,
    getSchoolForDashboardWrapper
} from '../../../graphQl/queries';
import { clearCookies, getCookie } from '../../../lib/manageCookies';
import { MINIO_PUBLIC_PATHS, PARENT, REFRESH_TOKEN_COOKIE, TEACHER } from '../../../shared/Constant';
import { isAdminViewAsMode, isViewAsMode, ThemeContext } from '../../../shared/Services/handler';
import CommonDrawer from '../CommonDrawer';
import MiniDrawer from './MiniDrawer';
import TeacherHeader from './TeacherHeader';
import UserAnnouncementsDrawer from '../UserAnnouncementsDrawer';

const DashboardWrapper = ({ children, userDetails }) => {
    const { callSnackbar, setToken, token, userAnnouncementContext } = useContext(ThemeContext);

    const pathname = usePathname();
    const router = useRouter();
    const theme = useTheme();
    const client = useApolloClient();

    const { schoolId: selectedSchoolIdForAdminView } = useDelegatedClaimsSubscriber();
    const schoolId = token?.schoolId ?? selectedSchoolIdForAdminView;

    const [open, setOpen] = useState(true);
    const [toggle, setToggle] = useState(false);

    const [logoutMutation] = useMutation(logout, { variables: { refreshToken: getCookie(REFRESH_TOKEN_COOKIE) } });

    const { data: schoolData, error: schoolError } = useQuery(getSchoolForDashboardWrapper, {
        variables: { id: schoolId },
        skip: !schoolId,
        fetchPolicy: 'cache-first'
    });

    const isMediumDesktop = useMediaQuery(theme.breakpoints.down('lg'));
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [getSchoolClassesDataQuery, { error: getSchoolClassesError, data: getSchoolClassesData }] =
        useLazyQuery(getSchoolClassesAndGroups);

    const [getGroupsAcrossClassesQuery, { error: getGroupsAcrossClassesError, data: getGroupsAcrossClassesData }] =
        useLazyQuery(getGroupsAcrossClasses);

    const [getSchoolAllClassesQuery, { error: getSchoolAllClassesError, data: getSchoolAllClassesData }] =
        useLazyQuery(getSchoolClassesAndGroups);

    const { error: getPreAdmissionClassesError, data: getPreAdmissionClassesData } = useQuery(getPreAdmissionClasses, {
        variables: {
            schoolId
        },
        skip: !schoolId
    });

    useEffect(() => {
        if (token?.sub && token?.schoolId) {
            getSchoolClassesDataQuery({
                variables: { schoolId, myClasses: true }
            });
            getGroupsAcrossClassesQuery({
                variables: { schoolId, myClasses: true }
            });
        }
        if (token?.isSchoolLeader || selectedSchoolIdForAdminView) {
            getSchoolAllClassesQuery({
                variables: { schoolId: schoolId, myClasses: false }
            });
            getGroupsAcrossClassesQuery({
                variables: { schoolId: schoolId, myClasses: false }
            });
        }
    }, [token.sub, token.schoolId, token.isSchoolLeader, schoolId]);

    useEffect(() => {
        getSchoolAllClassesError?.message && callSnackbar(getSchoolAllClassesError, 'error');
        getSchoolClassesError?.message && callSnackbar(getSchoolClassesError, 'error');
        getPreAdmissionClassesError?.message && callSnackbar(getPreAdmissionClassesError, 'error');
        getGroupsAcrossClassesError?.message && callSnackbar(getGroupsAcrossClassesError, 'error');
        schoolError?.message && callSnackbar(schoolError, 'error');
    }, [getSchoolClassesError, getSchoolAllClassesError, getPreAdmissionClassesError, getGroupsAcrossClassesError, schoolError]);

    const _onLogout = async () => {
        if (getCookie(REFRESH_TOKEN_COOKIE)) {
            await logoutMutation().catch(({ ...err }) => callSnackbar(err, 'error'));
        }

        callSnackbar('Logged out successfully', 'success');
        clearCookies(router?.push, setToken);
        client.clearStore();
    };

    const getAdminLayoutClass = (userType, pathname) => {
        if (userType === TEACHER || userType === PARENT) {
            return '';
        }

        if (isAdminViewAsMode(userType, pathname)) {
            return '';
        }

        if (pathname.startsWith('/admin/activity/')) {
            return '';
        }

        return 'admin-layout-container';
    };

    const rootClass = `teacher-layout-container ${pathname === '/resources' ? 'resources-layout-container' : ''} ${getAdminLayoutClass(token?.userType, pathname)}`;

    const adminAndTeacherProfilePopOverList = [
        {
            text: 'Account settings',
            image: `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Mathscot.svg`,
            onClick: () => router?.push('/account')
        },
        {
            text: 'Sign out',
            icon: 'login',
            dataTest: 'teacher-and-admin-popover-list-sign-out',
            onClick: _onLogout
        }
    ];

    const schoolDetails = schoolData?.getSchool;

    return (
        <div className="teacher-wrapper-container">
            {isMobile ? (
                <div className="teacher-header-mobile">
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={() => setToggle(!toggle)}
                        className="menu-button"
                        size="large">
                        <MenuIcon />
                    </IconButton>
                    {token?.sub && userAnnouncementContext?.hasAnnouncements ? <UserAnnouncementsDrawer /> : null}
                </div>
            ) : (
                <TeacherHeader
                    heading={schoolId ? (schoolDetails?.schoolName ?? 'Learning with Parents') : 'Learning with Parents'}
                    adminAndTeacherProfilePopOverList={adminAndTeacherProfilePopOverList}
                />
            )}
            {!isViewAsMode(token?.userType, pathname) && (
                <div>
                    {isMobile ? (
                        <Drawer
                            variant="temporary"
                            anchor="left"
                            open={toggle}
                            onClose={() => setToggle(!toggle)}
                            ModalProps={{
                                keepMounted: true
                            }}
                            className="sidebar-container-mobile">
                            {toggle && (
                                <CommonDrawer
                                    setOpen={setOpen}
                                    getSchoolClassesData={getSchoolClassesData}
                                    getSchoolAllClassesData={getSchoolAllClassesData}
                                    preAdmissionClassesData={getPreAdmissionClassesData?.getPreAdmissionClasses}
                                    getGroupsAcrossClassesData={getGroupsAcrossClassesData}
                                    open={open}
                                    toggle={toggle}
                                    selectedSchoolIdForAdminView={selectedSchoolIdForAdminView}
                                    adminAndTeacherProfilePopOverList={adminAndTeacherProfilePopOverList}
                                    setToggle={setToggle}
                                    userDetails={userDetails}
                                    schoolDetails={schoolDetails}
                                />
                            )}
                        </Drawer>
                    ) : (
                        <MiniDrawer open={open} setOpen={setOpen} isAdminViewAsMode={isAdminViewAsMode(token?.userType, pathname)}>
                            <CommonDrawer
                                setOpen={setOpen}
                                getSchoolClassesData={getSchoolClassesData}
                                getGroupsAcrossClassesData={getGroupsAcrossClassesData}
                                getSchoolAllClassesData={getSchoolAllClassesData}
                                preAdmissionClassesData={getPreAdmissionClassesData?.getPreAdmissionClasses}
                                adminAndTeacherProfilePopOverList={adminAndTeacherProfilePopOverList}
                                open={open}
                                toggle={toggle}
                                selectedSchoolIdForAdminView={selectedSchoolIdForAdminView}
                                setToggle={setToggle}
                                userDetails={userDetails}
                                schoolDetails={schoolDetails}
                            />
                        </MiniDrawer>
                    )}
                </div>
            )}
            <Container
                classes={{
                    root: 'teacher-layout-root'
                }}
                style={{ width: open && !isMediumDesktop ? `calc(100% - 280px)` : `calc(100% - 65px)` }}
                maxWidth={false}>
                <Grid className={rootClass}>{children}</Grid>
            </Container>
        </div>
    );
};

DashboardWrapper.propTypes = {
    children: PropTypes.element.isRequired,
    userDetails: PropTypes.object
};

export default DashboardWrapper;
