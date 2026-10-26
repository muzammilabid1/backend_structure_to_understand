import PropTypes from 'prop-types';
import React from 'react';

import { capitalizeFirstLetter, showDate, sortingDate } from '../../../shared/Services/handler';
import CommonDraggableTable from '../CommonDraggableTable';
import Heading2 from '../Typography/Heading2';

const CommonUserStatusLogsTable = ({ logs }) => {
    const head = [
        { accessor: 'col1', Header: 'New Status' },
        { accessor: 'col2', Header: 'Previous Status' },
        {
            accessor: 'col3',
            Header: 'Logged At',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col3, b.original?.col3)
        }
    ];

    const row = (logs || []).map((userStatusLog) => {
        return {
            id: userStatusLog?.id,
            col1: capitalizeFirstLetter(userStatusLog?.newStatus),
            col2: capitalizeFirstLetter(userStatusLog?.previousStatus),
            col3: userStatusLog?.logCreatedAt
        };
    });

    return (
        <div className="user-status-logs-container">
            <Heading2 text="User status logs" />
            <CommonDraggableTable rows={row} columns={head} customClass="row-height" />
        </div>
    );
};

CommonUserStatusLogsTable.propTypes = { logs: PropTypes.array.isRequired };

export default CommonUserStatusLogsTable;
