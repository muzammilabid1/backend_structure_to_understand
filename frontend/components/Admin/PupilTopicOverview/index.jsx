import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import { adminPath } from '../../../shared/Constant';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import PupilActivityOverview from './PupilActivityOverview';
import PupilTopicDetails from './PupilTopicDetails';

const PupilTopicOverview = () => {
    const [active, setActive] = useState(1);
    const tebs = ['Pupil Activities', 'Details'];
    const [classTopicId, setClassTopicId] = useState();
    const [pupil, setPupil] = useState();
    const queryParams = useParams();

    return (
        <div className="class_overview">
            <div className="header">
                <Heading2 text={'Pupil Topic'} />
                <div className="header-view-button">
                    <LWPButton btnText="Go to pupil" startIcon="child_care" href={`${adminPath}/child/${+pupil}`} />
                    <LWPButton btnText="Go to class topic" startIcon="visibility" href={`${adminPath}/classtopic/${classTopicId}`} />
                </div>
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 && <PupilActivityOverview setClassTopicId={setClassTopicId} pupiltopic_id={queryParams?.pupiltopic_id} />}
                {active === 1 && (
                    <PupilTopicDetails setPupil={setPupil} setClassTopicId={setClassTopicId} pupiltopic_id={queryParams?.pupiltopic_id} />
                )}
            </CommonTabs>
        </div>
    );
};

export default PupilTopicOverview;
