import React from 'react';

import Heading3 from '../../../Shared/Typography/Heading3';

type MessageStatsProps = {
    notificationCount?: {
        failedRejectedCount?: number;
        waitingQueuedCount?: number;
        sentCount?: number;
        deliveredCount?: number;
        clickedCount?: number;
    };
    type?: string;
};

const MessageStats = ({ notificationCount }: MessageStatsProps) => {
    return (
        <div className="message_stats">
            <Heading3 text="Message stats" />

            <ul className="statsList">
                <li>
                    <span className="dot" style={{ backgroundColor: '#E8492A' }}></span>
                    Failed/rejected
                    <span className="number">{notificationCount?.failedRejectedCount}</span>
                </li>
                <li>
                    <span className="dot" style={{ backgroundColor: '#F28D00' }}></span>
                    Waiting/queued
                    <span className="number">{notificationCount?.waitingQueuedCount}</span>
                </li>
                <li>
                    <span className="dot" style={{ backgroundColor: '#FDC300' }}></span>
                    Sent
                    <span className="number">{notificationCount?.sentCount}</span>
                </li>
                <li>
                    <span className="dot" style={{ backgroundColor: '#C6DD84' }}></span>
                    Delivered
                    <span className="number">{notificationCount?.deliveredCount}</span>
                </li>
                <li>
                    <span className="dot" style={{ backgroundColor: '#7F972A' }}></span>
                    Clicked
                    <span className="number">{notificationCount?.clickedCount}</span>
                </li>
            </ul>
        </div>
    );
};

export default MessageStats;
