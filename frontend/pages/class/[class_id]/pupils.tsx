import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/router';
import React, { useContext, useEffect } from 'react';

import CommonLoading from '../../../components/Shared/CommonLoading';
import Pupils from '../../../components/Teacher/Pupils';
import TeacherClassWrapper from '../../../components/Teacher/TeacherClassWrapper';
import { ThemeContext } from '../../../shared/Services/handler';
import { PageType } from '../../../types/enums/PageType';

const getSchoolClassForClassDetailsPage = gql`
    query schoolClass($id: String!) {
        schoolClass(id: $id) {
            id
            IsReadingLogsEnabled
            isFullProgramme
            isReadyTeddyEnabled
            isPreAdmissionClass
            isRegistrationClass
            subjects {
                name
            }
            status
            isLocked
            schoolClassName
            period {
                index
            }
            school {
                id
                misName
                curentPeriod {
                    index
                }
            }
            pupils {
                id
            }
            name
            yearGroup {
                year
            }
            parentClass {
                id
                name
            }
        }
    }
`;

const PupilsPage = () => {
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
        if (schoolClassError?.message) {
            callSnackbar(schoolClassError, 'error');
        }
    }, [schoolClassError]);

    if (schoolClassLoading) return <CommonLoading />;

    return (
        <div>
            <TeacherClassWrapper isVisibleClassInfo={true} />
            <Pupils classData={schoolClassData?.schoolClass} />
        </div>
    );
};

PupilsPage.pageType = PageType.TEACHER;
PupilsPage.pageTitle = 'Class: Pupils';

export default PupilsPage;
