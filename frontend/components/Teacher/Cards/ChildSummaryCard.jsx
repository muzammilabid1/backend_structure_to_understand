/* eslint-disable @next/next/no-img-element */
import { Tooltip } from '@mui/material';
import PropTypes from 'prop-types';
import React from 'react';

import { getPupilStatusDescription, getPupilStatusName } from '../../../lib/statuses/pupilStatus';
import { DEFAULT_EMPTY_IMAGE } from '../../../shared/Constant';
import { showDate } from '../../../shared/Services/handler';
import CommonCard from './../../Shared/Cards/CommonCard';
import SummaryCard from './../../Shared/Cards/SummaryCard';
import Paragraph from './../../Shared/Typography/Paragraph';

const ChildSummaryCard = ({
    class_name,
    pupilStatus,
    lastLogin,
    lastActivity,
    videoCount,
    watchedVideoCount,
    activityCount,
    feedbackCount,
    child_img
}) => {
    const rows = [
        {
            columns: [
                [
                    { label: 'Class', value: class_name },
                    { label: 'Last Login', value: lastLogin ? showDate({ date: lastLogin, year: true }) : '' }
                ],
                [
                    {
                        label: 'Status',
                        value: (
                            <Tooltip title={getPupilStatusDescription(pupilStatus)}>
                                <div className={`status-bar color-${pupilStatus?.toLowerCase()}`}>{getPupilStatusName(pupilStatus)}</div>
                            </Tooltip>
                        )
                    },
                    { label: 'Last activity', value: lastActivity ? showDate({ date: lastActivity, year: true }) : '' }
                ]
            ],
            aside: (
                <span className="side-img-container">
                    <img src={child_img || DEFAULT_EMPTY_IMAGE} alt="" className="side-img" />
                </span>
            )
        },
        {
            columns: [
                [
                    {
                        label: 'Videos',
                        value: watchedVideoCount || videoCount ? <Paragraph text={`${watchedVideoCount}/${videoCount}`} /> : <>0</>
                    }
                ],
                [{ label: 'Activities', value: activityCount || '0' }],
                [{ label: 'Comments / photos', value: feedbackCount || '0' }]
            ]
        }
    ];

    return (
        <CommonCard
            className="grid-card"
            cardClassName="child-summary-card-container"
            cardContentClassName="child-summary-content-section"
            lg={8}
            md={8}>
            <SummaryCard bare dividers rows={rows} rowClass="child-summary-section" stackSpacingClass="margin-bw-summary" />
        </CommonCard>
    );
};

ChildSummaryCard.propTypes = {
    class_name: PropTypes.string,
    pupilStatus: PropTypes.string,
    lastLogin: PropTypes.string,
    lastActivity: PropTypes.string,
    videoCount: PropTypes.number,
    watchedVideoCount: PropTypes.number,
    activityCount: PropTypes.number,
    feedbackCount: PropTypes.number,
    child_img: PropTypes.string
};

export default ChildSummaryCard;
