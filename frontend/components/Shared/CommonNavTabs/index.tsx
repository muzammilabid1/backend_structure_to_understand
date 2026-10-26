import { Avatar, Grid, Tab, Tabs } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';

import { ILwpSchoolClassDetails } from '../../../types/ILwpSchoolClass';

interface SubjectsProps {
    id?: string;
    name?: string;
}

interface CommonNavTabsProps {
    children?: ReactNode;
    isReading?: boolean;
    isFullProgramme?: boolean;
    isRegistrationClass?: boolean;
    subjects?: SubjectsProps[];
    attentionRequiredPupilsCount?: number;
    schoolClass?: ILwpSchoolClassDetails;
}

enum TabRoutes {
    Register = 'Register',
    Schedule = 'Schedule',
    Mathscots = 'Mathscots',
    ClassGroups = 'Class groups',
    ActivityGrid = 'Activity grid',
    WeekByWeek = 'Week by week',
    Pupils = 'Pupils'
}

const MuiTabs = withStyles({
    indicator: {
        backgroundColor: '#F28D00'
    }
})(Tabs);

const CommonNavTabs = ({
    children,
    isReading = false,
    isFullProgramme = true,
    isRegistrationClass = true,
    subjects = [],
    attentionRequiredPupilsCount = 0,
    schoolClass
}: CommonNavTabsProps) => {
    const queryParams = useParams();
    const pathname = usePathname();

    const [active, setActive] = useState(0);

    const tabs = useMemo(() => {
        let tabList: TabRoutes[] = [
            TabRoutes.WeekByWeek,
            TabRoutes.Pupils,
            TabRoutes.Schedule,
            TabRoutes.ActivityGrid,
            TabRoutes.ClassGroups
        ];

        if (isFullProgramme || (isReading && schoolClass?.school?.isMoneySkillsAvailable)) {
            tabList.splice(3, 0, TabRoutes.Mathscots);
        }

        if (!isRegistrationClass) {
            tabList = Array.from(new Set(tabList.filter((tab) => ![TabRoutes.ClassGroups, TabRoutes.Mathscots].includes(tab))));
        }

        if (!schoolClass?.classTopicContext?.hasReadingTopic && !schoolClass?.classTopicContext?.hasTopics) {
            tabList = tabList?.filter((tab) => tab !== TabRoutes.WeekByWeek);
        }

        return tabList;
    }, [isReading, isFullProgramme, isRegistrationClass, subjects, schoolClass]);

    const getRoute = (route: string): string => {
        switch (route) {
            case TabRoutes.Register:
                return 'register';

            case TabRoutes.Schedule:
                return 'schedule';

            case TabRoutes.Mathscots:
                return 'mathscots';

            case TabRoutes.ClassGroups:
                return 'class-groups';

            case TabRoutes.ActivityGrid:
                return 'activity-grid';

            case TabRoutes.WeekByWeek:
                return 'readingweek';

            case TabRoutes.Pupils:
                return 'pupils';

            default:
                return 'register';
        }
    };

    useEffect(() => {
        const getPath = pathname?.split('/');
        const pathName = getPath?.[getPath?.length - 1];

        // is on week by week page
        const isOnWeekByWeekPage = pathname.includes('topic') || pathname.includes('readingweek');

        const tabIndex = isOnWeekByWeekPage ? 0 : tabs.findIndex((tab) => getRoute(tab) === pathName);

        setActive(tabIndex || 0);
    }, [pathname, tabs]);

    return (
        <div className="common_tebs">
            <MuiTabs value={active} onChange={(_, newValue) => setActive(newValue)} aria-label="Mui example">
                {tabs.map((teb, key) => {
                    const renderTabs =
                        teb == TabRoutes.Pupils ? (
                            <Grid display={'flex'} alignItems={'center'} gap={1}>
                                {teb}
                                {attentionRequiredPupilsCount > 0 && (
                                    <Avatar
                                        sx={{
                                            width: '28px',
                                            height: '28px',
                                            fontSize: '14px',
                                            color: '#fff',
                                            bgcolor: '#F28D00'
                                        }}>
                                        {attentionRequiredPupilsCount}
                                    </Avatar>
                                )}
                            </Grid>
                        ) : (
                            teb
                        );

                    return (
                        <Link
                            key={key}
                            passHref
                            href={`/class/${queryParams?.class_id}/${getRoute(teb)}`}
                            scroll={false}
                            data-test={`common-nav-${teb.toLowerCase().replaceAll(' ', '-')}-tab`}>
                            <Tab key={key} disableRipple label={renderTabs} className={`tebs ${key === active ? 'Mui-selected' : ''}`} />
                        </Link>
                    );
                })}
            </MuiTabs>
            {children}
        </div>
    );
};

export default CommonNavTabs;
