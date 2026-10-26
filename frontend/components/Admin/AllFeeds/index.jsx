import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import CommonTabs from './../../Shared/CommonTabs';
import Heading2 from './../../Shared/Typography/Heading2';
import AllDemoFeedsAdmin from './AllDemoFeedsAdmin';
import AllFeedsAdmin from './AllFeedsAdmin';

const AllFeeds = () => {
    const [active, setActive] = useState(0);
    const searchParams = useSearchParams();
    const tabs = ['School Activities', 'Demo Activities'];

    useEffect(() => {
        if (searchParams.get('tab') === '1') setActive(1);
    }, [searchParams]);

    return (
        <div className="class_overview" data-test={'all-feeds-page'}>
            <Heading2 text={'All Feeds'} />
            <CommonTabs tebs={tabs} value={active} onChange={setActive}>
                {active === 0 ? <AllFeedsAdmin /> : <AllDemoFeedsAdmin />}
            </CommonTabs>
        </div>
    );
};

export default AllFeeds;
