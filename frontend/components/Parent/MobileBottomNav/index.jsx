/* eslint-disable @next/next/no-img-element */
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import PropTypes from 'prop-types';
import React from 'react';

import { MINIO_PUBLIC_PATHS, PupilType } from '../../../shared/Constant';
import { isPupilActiveInCurrentAcademicYear } from '../../../shared/Services/handler';

const MobileBottomNav = ({ value, onChange, pupil }) => {
    let items = [];
    const type = pupil?.pupil?.type;
    const isActiveInCurrentAcademicYear = isPupilActiveInCurrentAcademicYear(pupil?.pupil);
    const hasReadyTeddyTopic = !!pupil?.pupil?.currentReadyTeddyTopicForScrapbook?.id;

    const scrapbookItem = {
        label: 'Moments',
        icon: 'scrapbook_tab.svg',
        value: 'scrapbook',
        imgClass: 'active-icon',
        visible: hasReadyTeddyTopic
    };

    if (type === PupilType.BOTH) {
        items = [
            {
                label: 'Home',
                icon: 'homeIconMob.svg',
                value: 'home',
                imgClass: 'icon active-icon',
                visible: true
            },
            {
                label: 'Reading',
                icon: 'reading_tab.svg',
                value: 'reading',
                imgClass: 'active-icon',
                visible: isActiveInCurrentAcademicYear
            },
            {
                label: 'Topics',
                icon: 'topic_tab.svg',
                value: 'topics',
                imgClass: 'active-icon',
                visible: isActiveInCurrentAcademicYear
            },
            scrapbookItem,
            {
                label: 'Review',
                icon: 'review_tab.svg',
                value: 'review',
                imgClass: 'active-icon',
                visible: true
            }
        ];
    } else if (type === PupilType.TOPIC) {
        items = [
            {
                label: 'Home',
                icon: 'homeIconMob.svg',
                value: 'home',
                imgClass: 'icon active-icon',
                visible: true
            },
            {
                label: 'Topics',
                icon: 'topic_tab.svg',
                value: 'topics',
                imgClass: 'active-icon',
                visible: isActiveInCurrentAcademicYear
            },
            scrapbookItem,
            {
                label: 'Review',
                icon: 'review_tab.svg',
                value: 'review',
                imgClass: 'active-icon',
                visible: true
            }
        ];
    } else if (type === PupilType.READING) {
        items = [
            {
                label: 'Home',
                icon: 'homeIconMob.svg',
                value: 'home',
                imgClass: 'icon active-icon',
                visible: !isActiveInCurrentAcademicYear
            },
            {
                label: 'Reading log',
                icon: 'reading_tab.svg',
                value: 'reading',
                imgClass: 'active-icon',
                visible: isActiveInCurrentAcademicYear
            },
            {
                label: 'Weeks',
                icon: 'week_tab.svg',
                value: 'weeks',
                imgClass: 'active-icon',
                visible: isActiveInCurrentAcademicYear
            },
            scrapbookItem,
            {
                label: 'Review',
                icon: 'review_tab.svg',
                value: 'review',
                imgClass: 'active-icon',
                visible: true
            }
        ];
    }

    items = items.filter((item) => item.visible);

    return (
        <BottomNavigation value={value} onChange={onChange} showLabels className="mobile-bottom-nav-container">
            {items?.map((item) => (
                <BottomNavigationAction
                    label={item?.label}
                    icon={
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/${item?.icon}`}
                            className={item?.imgClass}
                        />
                    }
                    value={item?.value}
                    className="nav-action-btn"
                />
            ))}
        </BottomNavigation>
    );
};

MobileBottomNav.propTypes = { value: PropTypes.string, onChange: PropTypes.func, pupil: PropTypes.object };

export default MobileBottomNav;
