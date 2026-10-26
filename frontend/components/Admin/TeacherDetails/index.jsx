import { useParams } from 'next/navigation';
import React, { useState } from 'react';

import { showDate } from '../../../shared/Services/handler';
import CommonTabs from '../../Shared/CommonTabs';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';
import UserNotifications from '../ChildParentDetails/Notifications';
import Classes from './Classes';
import Details from './Details';

const TeacherDetailsForAdmin = () => {
    const [active, setActive] = useState(0);
    const [teacherName, setTeacherName] = useState('Teacher name');
    const [teacherLastAccess, setTeacherLastAccess] = useState('');
    const queryParams = useParams();

    const tebs = ['Details', 'Classes', 'Notifications'];

    return (
        <div className="teacher_detials">
            <div className="header">
                <Heading2 text={teacherName} />
                <Paragraph
                    text={`Last access ${teacherLastAccess ? showDate({ date: teacherLastAccess, time: true }) : 'not login yet'}`}
                />
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? (
                    <Details
                        setTeacherName={setTeacherName}
                        setTeacherLastAccess={setTeacherLastAccess}
                        teacher_id={queryParams?.teacher_id}
                    />
                ) : active === 1 ? (
                    <Classes />
                ) : (
                    <UserNotifications isParent={false} />
                )}
            </CommonTabs>
        </div>
    );
};

export default TeacherDetailsForAdmin;
