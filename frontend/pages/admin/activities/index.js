import { useRouter } from 'next/compat/router';
import React from 'react';

import Activities from '../../../components/Admin/TopicsOverview/Activities';
import CommonTabs from '../../../components/Shared/CommonTabs';
import Heading2 from '../../../components/Shared/Typography/Heading2';
import { PageType } from '../../../types/enums/PageType';

const ActivitiesPage = () => {
    const router = useRouter();
    const tebs = ['Topics', 'Activities'];

    return (
        <div className="schools_overview">
            <div className="header">
                <Heading2 text={'Topics'} />
            </div>
            <CommonTabs
                tebs={tebs}
                value={1}
                onChange={() => {
                    router?.push('/admin/topics', undefined, { scroll: false });
                }}>
                <Activities />
            </CommonTabs>
        </div>
    );
};

ActivitiesPage.pageType = PageType.ADMIN;
ActivitiesPage.pageTitle = 'Admin: Activities';

export default ActivitiesPage;
