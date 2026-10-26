import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import { adminPath } from '../../../shared/Constant';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import PupilActivityDetails from './PupilActivityDetails';
import PupilFeedbackOverview from './PupilFeedbackOverview';

const PupilActivityOverview = () => {
    const [active, setActive] = useState(1);
    const [pupilTopicId, setPupilTopicId] = useState();
    const queryParams = useParams();
    const tebs = ['Feedbacks', 'Details'];

    return (
        <div className="class_overview">
            <div className="header">
                <Heading2 text={'Pupil Topic'} />
                <div className="header-view-button">
                    <a href={`${adminPath}/pupiltopic/${pupilTopicId}`}>
                        <LWPButton btnText="Go to pupil topic" startIcon="visibility" />
                    </a>
                </div>
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 && (
                    <PupilFeedbackOverview setPupilTopicId={setPupilTopicId} pupilactivity_id={queryParams?.pupilactivity_id} />
                )}
                {active === 1 && (
                    <PupilActivityDetails setPupilTopicId={setPupilTopicId} pupilactivity_id={queryParams?.pupilactivity_id} />
                )}
            </CommonTabs>
        </div>
    );
};

export default PupilActivityOverview;
