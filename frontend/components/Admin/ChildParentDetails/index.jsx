import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import LWPButton from '../../Shared/Button/LWPButton';
import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import Details from './Details';
import History from './History';
import UserNotifications from './Notifications';
import Pupils from './Pupils';

const ChildDetailsAdmin = () => {
    const queryParams = useParams();

    const [active, setActive] = useState(0);
    const [parentName, setParentName] = useState('Pupil name');

    return (
        <div className="child_details">
            <div className="header">
                <Heading2 text={parentName} />
                <div className="header-view-button">
                    <LWPButton btnText="View as parent" startIcon="visibility" href={`/parent/${queryParams?.parent_id}`} />
                </div>
            </div>
            <CommonTabs tebs={['Details', 'Pupils', 'History', 'Notifications']} value={active} onChange={setActive}>
                {active === 0 ? (
                    <Details setParentName={setParentName} />
                ) : active === 1 ? (
                    <Pupils />
                ) : active === 2 ? (
                    <History />
                ) : (
                    <UserNotifications isParent={true} />
                )}
            </CommonTabs>
        </div>
    );
};

export default ChildDetailsAdmin;
