import { Tab, Tabs } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';

import { PupilType } from '../../../shared/Constant';
import NotActiveThisYearBanner from '../NotActiveThisYearBanner';
import { isPupilActiveInCurrentAcademicYear } from '../../../shared/Services/handler';

const AntTabs = withStyles({
    indicator: {
        backgroundColor: '#F28D00'
    }
})(Tabs);

const CommonNavTabsForPupilHome = ({ children, pupil }) => {
    const [active, setActive] = useState(0);
    const queryParams = useParams();
    const router = useRouter();
    const type = pupil?.pupil?.type;
    const isActiveInCurrentAcademicYear = isPupilActiveInCurrentAcademicYear(pupil?.pupil);

    const hasReadyTeddyTopic = !!pupil?.pupil?.currentReadyTeddyTopicForScrapbook?.id;
    let tebs = [];

    if (type === PupilType.BOTH) {
        tebs = [
            { label: 'Reading log', dataTest: 'reading-log-tab', visible: isActiveInCurrentAcademicYear },
            { label: 'Topics', dataTest: 'topics-tab', visible: isActiveInCurrentAcademicYear },
            { label: 'Awards', dataTest: 'awards-tab', visible: true },
            { label: 'Books', dataTest: 'books-tab', visible: true },
            { label: 'History', dataTest: 'history-tab', visible: true },
            { label: 'Scrapbook', dataTest: 'scrapbook-tab', visible: hasReadyTeddyTopic }
        ];
    } else if (type === PupilType.TOPIC) {
        tebs = [
            { label: 'Topics', dataTest: 'topics-tab', visible: isActiveInCurrentAcademicYear },
            { label: 'Awards', dataTest: 'awards-tab', visible: true },
            { label: 'History', dataTest: 'history-tab', visible: true },
            { label: 'Scrapbook', dataTest: 'scrapbook-tab', visible: hasReadyTeddyTopic }
        ];
    } else if (type === PupilType.READING) {
        tebs = [
            { label: 'Reading log', dataTest: 'reading-log-tab', visible: isActiveInCurrentAcademicYear },
            { label: 'Weeks', dataTest: 'weeks-tab', visible: isActiveInCurrentAcademicYear },
            { label: 'Awards', dataTest: 'awards-tab', visible: true },
            { label: 'Books', dataTest: 'books-tab', visible: true },
            { label: 'Scrapbook', dataTest: 'scrapbook-tab', visible: hasReadyTeddyTopic }
        ];
    }

    tebs = tebs.filter((tab) => tab?.visible);

    const getRoute = (tab) => {
        switch (tab) {
            case 'Topics':
                return 'topics';

            case 'Awards':
                return 'trophies';

            case 'History':
                return 'history';

            case 'Reading log':
                return 'reading';

            case 'Weeks':
                return 'weeks';

            case 'Books':
                return 'book-history';

            case 'Scrapbook':
                return 'scrapbook';

            default:
                return '';
        }
    };

    useEffect(() => {
        const currentPath = router?.route?.split('/');
        const activeTab = currentPath?.[currentPath?.length - 1];

        setActive(activeTab);
    }, [router?.route, pupil]);

    const onTabChange = (_, tabValue) => {
        router?.push(`/child/${queryParams?.child_id}/${tabValue}`, undefined, { scroll: false });
    };

    return (
        <div className="common_tebs" id="commonTabsWrapper">
            {!isActiveInCurrentAcademicYear ? <NotActiveThisYearBanner className="not-active-this-year-banner-alert" /> : null}
            <AntTabs value={active} onChange={onTabChange} aria-label="ant example">
                {tebs.map((teb) => (
                    <Tab
                        value={getRoute(teb.label)}
                        disableRipple
                        label={teb.label}
                        className={`tebs ${getRoute(teb.label) == active ? 'Mui-selected' : ''}`}
                        data-test={teb.dataTest}
                    />
                ))}
            </AntTabs>
            {children}
        </div>
    );
};

CommonNavTabsForPupilHome.propTypes = {
    children: PropTypes.element.isRequired,
    pupil: PropTypes.object
};

export default CommonNavTabsForPupilHome;
