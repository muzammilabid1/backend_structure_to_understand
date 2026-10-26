import React from 'react';

import { capitalizeFirstLetter, showDate } from '../../../../shared/Services/handler';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatusStatsProps = any;

const StatusStats = ({ stats }: StatusStatsProps) => {
    return (
        <div className="Status_stats">
            <Heading3 text="Status change history" />

            <ul className="statsList">
                {stats?.map((item) => {
                    return (
                        <li style={{ display: 'flex' }}>
                            <Paragraph style={{ width: '100%' }} text={capitalizeFirstLetter(item?.status)} />
                            <Heading3
                                style={{ width: '100%' }}
                                text={item?.logCreatedAt ? showDate({ date: item?.logCreatedAt, time: true }) : '-'}
                            />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default StatusStats;
