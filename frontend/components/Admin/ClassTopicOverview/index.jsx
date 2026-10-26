import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import ClassTopicDetails from './ClassTopicDetails';
import PupilTopicOverview from './PupilTopicOverview';

const ClassTopicOverview = () => {
    const [active, setActive] = useState(1);
    const tebs = ['Pupil Topics', 'Details'];
    const [classId, setClassId] = useState();
    const queryParams = useParams();

    return (
        <div className="class_overview">
            <div className="header">
                <Heading2 text="Class Topic" />
                <div className="header-view-button">
                    <LWPButton btnText="Go to class" startIcon="school" href={`/admin/class/${classId}`} />
                </div>
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 && <PupilTopicOverview setClassId={setClassId} classtopic_id={queryParams?.classtopic_id} />}
                {active === 1 && <ClassTopicDetails setClassId={setClassId} classtopic_id={queryParams?.classtopic_id} />}
            </CommonTabs>
        </div>
    );
};

export default ClassTopicOverview;
