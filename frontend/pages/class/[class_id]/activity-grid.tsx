import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import CommonLoading from '../../../components/Shared/CommonLoading';
import ActivityGrid from '../../../components/Teacher/ActivityGrid';
import TeacherClassWrapper from '../../../components/Teacher/TeacherClassWrapper';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const getSchoolClassForClassDetailsPage = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            IsReadingLogsEnabled
            isFullProgramme
            isGroupAcrossClasses
            isRegistrationClass
            subjects {
                name
            }
            status
            schoolClassName
            school {
                misName
            }
            parentClass {
                id
                name
            }
        }
    }
`;

const ActivityGridPage = () => {
    const { query } = useRouter();
    const { callSnackbar } = useContext(ThemeContext);

    const {
        error: schoolClassError,
        data: schoolClassData,
        loading: schoolClassLoading
    } = useQuery(getSchoolClassForClassDetailsPage, {
        variables: { id: query?.class_id },
        skip: !query?.class_id
    });

    useEffect(() => {
        if (schoolClassError?.message) {
            callSnackbar(schoolClassError, 'error');
        }
    }, [schoolClassError]);

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <div>
            <TeacherClassWrapper />
            <ActivityGrid classData={schoolClassData?.schoolClass} />
        </div>
    );
};

ActivityGridPage.pageType = PageType.TEACHER;
ActivityGridPage.pageTitle = 'Class: Activity grid';

export default ActivityGridPage;
