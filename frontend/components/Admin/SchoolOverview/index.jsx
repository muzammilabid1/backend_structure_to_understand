import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import ClassesOverview from './ClassesOverview';
import Details from './Details';
import Holiday from './Holiday';
import ImpactReport from './ImpactReport';
import StaffOverview from './StaffOverview';
import WondeClasses from './WondeClasses';

const SchoolOverviewAdmin = () => {
    const [active, setActive] = useState(2);
    const [isSchoolMIS, setIsSchoolMIS] = useState(false);
    const [schoolName, setSchoolName] = useState('School name');
    const [schoolHolidayPeriod, setSchoolHolidayPeriod] = useState(null);
    const queryParams = useParams();
    const tebs = [
        { label: 'Classes', dataTest: 'classes-school-overview-tab' },
        { label: 'Staff', dataTest: 'staff-school-overview-tab' },
        { label: 'Details', dataTest: 'details-school-overview-tab' },
        { label: 'Holidays', dataTest: 'holidays-school-overview-tab' },
        { label: 'Impact', dataTest: 'impact-school-overview-tab' }
    ];

    useEffect(() => {
        if (isSchoolMIS) {
            setActive(3);
        }
    }, [isSchoolMIS]);

    if (isSchoolMIS) {
        tebs.splice(1, 0, { label: 'Wonde classes', dataTest: 'wonde-classes-school-overview-tab' });
    }

    const showTabData = (active, isSchoolMIS) => {
        // Define common props to avoid repetition
        const commonProps = {
            schoolId: queryParams?.school_id,
            setSchoolName,
            setIsSchoolMIS,
            setSchoolHolidayPeriod
        };

        // Define component mappings for School MIS
        const schoolMISComponents = [
            <ClassesOverview {...commonProps} />,
            <WondeClasses {...commonProps} />,
            <StaffOverview school_id={queryParams?.school_id} />,
            <Details {...commonProps} />,
            <Holiday schoolHolidayPeriod={schoolHolidayPeriod} />,
            <ImpactReport {...commonProps} />
        ];

        // Define component mappings for non-School MIS
        const nonSchoolMISComponents = [
            <ClassesOverview {...commonProps} />,
            <StaffOverview school_id={queryParams?.school_id} />,
            <Details {...commonProps} />,
            <Holiday schoolHolidayPeriod={schoolHolidayPeriod} />,
            <ImpactReport {...commonProps} />
        ];

        // Choose the appropriate component array based on isSchoolMIS
        const components = isSchoolMIS ? schoolMISComponents : nonSchoolMISComponents;

        // Return the component corresponding to the active index, or null if out of range
        return components[active] || null;
    };

    const { setClaims } = useDelegatedClaims();
    const router = useRouter();

    return (
        <div className="school_overview">
            <div className="header">
                <Heading2 text={schoolName} />
                <div className="header-view-button">
                    <LWPButton
                        btnText="View as teacher"
                        startIcon="visibility"
                        onClick={() => {
                            const newClaims = {
                                schoolId: queryParams.school_id
                            };

                            setClaims(newClaims);
                            router?.push(`/school/${queryParams?.school_id}`);
                        }}
                    />
                </div>
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {showTabData(active, isSchoolMIS)}
            </CommonTabs>
        </div>
    );
};

export default SchoolOverviewAdmin;
