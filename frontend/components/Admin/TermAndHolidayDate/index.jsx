import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import CommonTabs from '../../Shared/CommonTabs';
import HolidayOverviewAdmin from './holidayOverview';
import TermsOverviewAdmin from './termOverview';

const TermAndHolidayDates = () => {
    const [active, setActive] = useState(0);
    const tebs = ['Terms', 'Default holiday dates'];

    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('tab') === '1') setActive(1);
    }, [searchParams]);

    return (
        <div data-test={'term-dates-page'}>
            <CommonTabs tebs={tebs} value={active} onChange={setActive}>
                {active === 0 ? <TermsOverviewAdmin /> : <HolidayOverviewAdmin />}
            </CommonTabs>
        </div>
    );
};

export default TermAndHolidayDates;
