import { useLazyQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getLogParentPupilActionHistory } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, PAGINATION_ITEM_LIMIT } from '../../../shared/Constant';
import { _onSkip, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonStatus from './../../Shared/CommonStatus';

const UserHistory = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();

    const [defaultPage, setDefaultPage] = useState(1);

    const [getLogParentPupilActionHistoryQuery, { loading, error, data }] = useLazyQuery(getLogParentPupilActionHistory);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _fetchMore = (page = defaultPage) => {
        setDefaultPage(page);
        const offset = _onSkip(page);

        getLogParentPupilActionHistoryQuery({
            variables: {
                userId: queryParams?.parent_id,
                offset,
                limit: PAGINATION_ITEM_LIMIT
            }
        });
    };

    useEffect(() => {
        _fetchMore();
    }, []);

    const head = [
        {
            accessor: 'col1',
            Header: 'Action'
        },
        { accessor: 'col2', Header: 'Pupil ID' },
        { accessor: 'col3', Header: 'Parameter 1' },
        { accessor: 'col4', Header: 'Parameter 2' },
        { accessor: 'col5', Header: 'Parameter 3' },
        {
            accessor: 'col6',
            Header: 'Created At',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col6, b.original?.col6)
        }
    ];

    const row = (data?.getLogParentPupilActionHistory?.results || []).map((userHistory) => {
        return {
            id: userHistory.id,
            col1: userHistory?.action,
            col2: userHistory?.pupilId,
            col3: userHistory?.param1 ? userHistory?.param1 : '-',
            col4: userHistory?.param2 ? userHistory?.param2 : '-',
            col5: userHistory?.param3 ? userHistory?.param3 : '-',
            col6: userHistory?.time
        };
    });

    return (
        <div className="schools_overview">
            {!data?.getLogParentPupilActionHistory?.results?.length ? (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`}
                    className="no-topics"
                    imageAlt={''}
                    heading="No History Found"
                    subHeading="This user does not have any history in our system."
                />
            ) : (
                <CommonDraggableTable rows={row} columns={head} loading={loading} />
            )}
        </div>
    );
};

export default UserHistory;
