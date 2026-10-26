import React, { useState } from 'react';

import Heading2 from '../../Shared/Typography/Heading2';
import CommonTabs from './../../Shared/CommonTabs';
import Features from './Features';
import Tooltips from './FeatureTooltips';

const EmailHandler = () => {
    const [active, setActive] = useState(0);

    const tebs = ['Features', 'Tooltips'];

    return (
        <div className="features-page" data-test={'features-page'}>
            <div className="header">
                <Heading2 text={'Features'} />
            </div>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? <Features /> : <Tooltips />}
            </CommonTabs>
        </div>
    );
};

export default EmailHandler;
