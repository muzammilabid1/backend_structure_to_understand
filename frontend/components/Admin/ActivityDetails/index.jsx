import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import ActivityPreview from './ActivityPreview';
import Details from './Details';

const ActivityDetailsForAdmin = () => {
    const [active, setActive] = useState(0);
    const [activityName, setActivityName] = useState('Class name');
    const [topicId, setTopicId] = useState(null);
    const queryParams = useParams();
    const router = useRouter();

    const tebs = ['Details', 'Preview'];

    return (
        <div className="teacher_detials activity_detail_for_admin">
            {topicId && (
                <div className="desktop-btn">
                    <LWPButton
                        btnText="Go back to topic"
                        startIcon="navigate_before"
                        color="inherit"
                        variant="text"
                        size="medium"
                        onClick={() => router?.push(`/admin/topic/${topicId}`)}
                    />
                </div>
            )}
            <div className="header">
                <Heading2 text={activityName} />
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? (
                    <Details setActivityName={setActivityName} activity_id={queryParams?.activity_id} setTopicId={setTopicId} />
                ) : (
                    <ActivityPreview isAdminView={true} setTopicId={setTopicId} />
                    // <Activities open={open} setActivityName={setActivityName} setOpen={setOpen} />
                )}
            </CommonTabs>
        </div>
    );
};

export default ActivityDetailsForAdmin;
