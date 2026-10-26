import { useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { useDelegatedClaims } from '../../../context/DelegatedClaimsContext';
import { getSchoolClassSchoolData } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import ClassDetails from './ClassDetails';
import ClassTopicOverview from './ClassTopicOverview';
import StudentOverview from './StudentOverview';

const ClassOverviewAdmin = () => {
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [active, setActive] = useState(2);
    const tebs = ['Students', 'Class Topics', 'Details'];
    const [className, setClassName] = useState('Class Name');
    const { error, data: classSchoolData } = useQuery(getSchoolClassSchoolData, {
        variables: { id: queryParams?.class_id }
    });
    const { setClaims } = useDelegatedClaims();

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    return (
        <div className="class_overview">
            <LWPButton
                btnText="Back to class school"
                startIcon="navigate_before"
                color="inherit"
                variant="text"
                size="medium"
                onClick={() => router?.push(`${adminPath}/school/${classSchoolData?.schoolClass?.school?.id}`)}
            />
            <div className="header">
                <Heading2 text={`${className}`} />
                <div className="header-view-button">
                    <LWPButton
                        btnText="View as teacher"
                        startIcon="visibility"
                        onClick={() => {
                            setClaims({
                                schoolId: classSchoolData?.schoolClass?.school?.id
                            });
                            router?.push(`/class/${queryParams?.class_id}/activity-grid`);
                        }}
                    />
                </div>
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? (
                    <StudentOverview setClassName={setClassName} class_id={queryParams?.class_id} />
                ) : active === 1 ? (
                    <ClassTopicOverview class_id={queryParams?.class_id} />
                ) : (
                    <ClassDetails setClassName={setClassName} schoolId={classSchoolData?.schoolClass?.school?.id} />
                )}
            </CommonTabs>
        </div>
    );
};

export default ClassOverviewAdmin;
