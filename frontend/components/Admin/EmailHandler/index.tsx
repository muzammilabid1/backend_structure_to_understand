import React, { useState } from 'react';

import CommonTabs from './../../Shared/CommonTabs';
import AutomatedMessages from './AutomatedMessages';
import MessageLayout from './MessageLayout';

const EmailHandler = () => {
    const [active, setActive] = useState(0);

    const tebs = ['Automated messages', 'Message layout'];

    return (
        <div className="email_handler" data-test={'email-templates-page'}>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? <AutomatedMessages /> : <MessageLayout />}
            </CommonTabs>
        </div>
    );
};

export default EmailHandler;
