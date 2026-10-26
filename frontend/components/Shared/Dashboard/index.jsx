import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';

import { useDelegatedClaimsSubscriber } from '../../../context/DelegatedClaimsContext';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../CommonLoading';
import DashboardWrapper from './../DashboardWrapper';
import { isAdminViewAsMode } from '../../../shared/Services/handler';
import { getUserForCommonDrawer } from '../../../graphQl/queries';

const Dashboard = ({ children }) => {
    const router = useRouter();
    const { callSnackbar, userId, token } = useContext(ThemeContext);

    const { schoolId: selectedSchoolIdForViewAsAdmin } = useDelegatedClaimsSubscriber();
    const schoolId = isAdminViewAsMode(token?.userType, router.pathname) ? selectedSchoolIdForViewAsAdmin : token?.schoolId;

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForCommonDrawer, {
        variables: { id: userId },
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [getUserError]);

    if (getUserLoading) return <CommonLoading />;

    const userDetails = user?.getUser || {};

    return (
        <DashboardWrapper selectedSchoolIdForAdminView={schoolId || null} userDetails={userDetails}>
            {children}
        </DashboardWrapper>
    );
};

Dashboard.propTypes = {
    children: PropTypes.element
};

export default Dashboard;
