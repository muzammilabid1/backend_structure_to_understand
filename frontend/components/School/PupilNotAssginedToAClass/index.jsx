import { gql, useQuery } from '@apollo/client';
import React, { useContext, useEffect, useMemo } from 'react';

import { getAllYearGroups, getSchoolPupilsWithoutClasses } from '../../../graphQl/queries';
import { PUPILS_NOT_IN_CLASS } from '../../../shared/Constant';
import { getPupilYearGroup, ThemeContext } from '../../../shared/Services/handler';
import CommonLoading from '../../Shared/CommonLoading';
import Heading1 from './../../Shared/Typography/Heading1';
import PreRegistrationPupilNotAssignedToFutureClass from './PreRegistrationPupilNotAssignedToFutureClass';
import PupilNotAssignedToAClassCurrentAcademicYear from './PupilNotAssignedToAClassCurrentAcademicYear';
import CommonTabs from '../../Shared/CommonTabs';
import { useRouter } from 'next/router';
import Paragraph from '../../Shared/Typography/Paragraph';

export const getSchool = gql`
    query getSchool($id: String!) {
        getSchool(id: $id) {
            id
            schoolName
            pupilsWithoutClassesCount {
                currentYear
                nextYearNonIgnoredPupils
            }
            curentPeriod {
                nextPeriod {
                    shortName
                }
            }
        }
    }
`;

const PupilNotAssignedToAClass = () => {
    const router = useRouter();
    const type = router?.query?.type; // type will be either CURRENT_YEAR_PUPILS or NEXT_YEAR_PUPILS

    const preRegistrationPupils = type === PUPILS_NOT_IN_CLASS.NEXT_YEAR_PUPILS; // if type is NEXT_YEAR_PUPILS, then preRegistrationPupils will be true

    const { callSnackbar } = useContext(ThemeContext);
    const schoolId = router?.query?.school_id;

    const {
        error: error,
        data: pupilsWithoutClasses,
        loading
    } = useQuery(getSchoolPupilsWithoutClasses, {
        variables: { schoolId, isPreRegistrationPupils: preRegistrationPupils },
        skip: !schoolId
    });

    const { error: yearGroupError, data: yearGroups } = useQuery(getAllYearGroups);

    const {
        error: schoolError,
        data: schoolData,
        loading: schoolLoading
    } = useQuery(getSchool, {
        variables: { id: schoolId },
        skip: !schoolId
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        schoolError?.message && callSnackbar(schoolError, 'error');
        yearGroupError?.message && callSnackbar(yearGroupError, 'error');
    }, [error, schoolError, yearGroupError]);

    const schoolDetails = schoolData?.['getSchool'];

    const allPupils = useMemo(() => {
        return (pupilsWithoutClasses?.['getSchoolPupilsWithoutClasses'] || []).map((pupil) => {
            return {
                id: pupil.id,
                pupilNameColumn: pupil?.fullname,
                yearGroupColumn: getPupilYearGroup(yearGroups?.allYearGroup, pupil?.yearGroup),
                prevClassColumn: pupil?.classes?.[0]?.name
                    ? `${pupil?.classes?.[0]?.period?.shortName ?? '-'}: ${pupil?.classes?.[0]?.name ?? '-'}`
                    : '-',
                isIgnoredForFutureYearClasses: pupil?.isIgnoredForFutureYearClasses
            };
        });
    }, [pupilsWithoutClasses?.['getSchoolPupilsWithoutClasses']]);

    const tabs = [
        {
            label: 'Pupils from current academic year',
            badge: schoolDetails?.pupilsWithoutClassesCount?.currentYear || 0,
            dataTest: 'current-academic-year-pupils-tab'
        },
        {
            label: `Pre-registration pupils`,
            badge: schoolDetails?.pupilsWithoutClassesCount?.nextYearNonIgnoredPupils || 0,
            dataTest: 'next-academic-year-pupils-tab'
        }
    ];
    const active = preRegistrationPupils ? 1 : 0;

    const handleChangeTab = (index) =>
        router.replace(
            {
                pathname: router.pathname,
                query: {
                    ...router.query,
                    type: index === 0 ? PUPILS_NOT_IN_CLASS.CURRENT_YEAR_PUPILS : PUPILS_NOT_IN_CLASS.NEXT_YEAR_PUPILS
                }
            },
            undefined,
            { shallow: true }
        );

    return (
        <div className="pupils_not_assigned">
            <Heading1 text={`Pupils not assigned to a class`} customClass="pupils_not_assigned_heading" />
            <Paragraph
                text="If you wish to add pupils to a class in bulk, please go to the class register page and select add pupils -> add exisitng pupils."
                customClass="mb8"
            />
            {schoolLoading ? (
                <CommonLoading />
            ) : (
                <CommonTabs tebs={tabs} value={active} onChange={handleChangeTab}>
                    {loading ? (
                        <CommonLoading />
                    ) : preRegistrationPupils ? (
                        <PreRegistrationPupilNotAssignedToFutureClass schoolDetails={schoolDetails} pupils={allPupils} />
                    ) : (
                        <PupilNotAssignedToAClassCurrentAcademicYear schoolDetails={schoolDetails} pupils={allPupils} />
                    )}
                </CommonTabs>
            )}
        </div>
    );
};

export default PupilNotAssignedToAClass;
