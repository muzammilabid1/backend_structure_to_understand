import PropTypes from 'prop-types';
import React from 'react';

import { capitalizeFirstLetter, showDate } from '../../../shared/Services/handler';
import SummaryCard from '../Cards/SummaryCard';

const CommonLoginInfoCard = ({ deviceType, browserName, loginType, userAgent, osName, lastLogin }) => {
    const rows = [
        {
            columns: [
                [{ label: 'Date & time', value: showDate({ date: lastLogin, time: true }) }],
                [{ label: 'Login type', value: capitalizeFirstLetter(loginType) }]
            ]
        },
        {
            columns: [
                [{ label: 'Device', value: capitalizeFirstLetter(deviceType) }],
                [{ label: 'Browser', value: browserName }],
                [{ label: 'OS', value: osName }]
            ]
        },
        {
            columns: [[{ label: 'User agent', value: userAgent }]]
        }
    ];

    return <SummaryCard rows={rows} className="last-login-container" rowClass="login-info-detail" />;
};

CommonLoginInfoCard.propTypes = {
    deviceType: PropTypes.string,
    browserName: PropTypes.string,
    loginType: PropTypes.string,
    userAgent: PropTypes.string,
    osName: PropTypes.string,
    lastLogin: PropTypes.string
};

export default CommonLoginInfoCard;
