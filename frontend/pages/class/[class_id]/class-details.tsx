import { useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import ClassDetailsSetting from '../../../components/Class/ClassDetails/ClassDetailsSetting';
import ClassGroupsSetting from '../../../components/Class/ClassDetails/ClassGroupsSetting';
import CommonLoading from '../../../components/Shared/CommonLoading';
import { getSchoolClassForClassDetailsPage } from '../../../graphQl/queries';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const ClassDetailsSettingsPage = () => {
    const { query } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const {
        error: schoolClassError,
        data: schoolClassData,
        loading: schoolClassLoading
    } = useQuery(getSchoolClassForClassDetailsPage, {
        variables: { id: query?.class_id }
    });

    useEffect(() => {
        if (schoolClassError?.message) callSnackbar(schoolClassError, 'error');
    }, [schoolClassError]);

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <div data-test={'class-details-page'}>
            {schoolClassData?.schoolClass?.isRegistrationClass ? (
                <ClassDetailsSetting schoolClassData={schoolClassData} />
            ) : (
                <ClassGroupsSetting schoolClassData={schoolClassData} />
            )}
        </div>
    );
};

ClassDetailsSettingsPage.pageType = PageType.TEACHER;
ClassDetailsSettingsPage.pageTitle = 'Class: Details';

export default ClassDetailsSettingsPage;
