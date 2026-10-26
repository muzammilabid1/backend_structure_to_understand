import { gql, useMutation, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { ADMIN } from '../../../shared/Constant';
import { processText, showDate, sortingDate, ThemeContext } from '../../../shared/Services/handler';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import InputField from './../../Shared/InputField/InputField';

const allAdminQueriesForExportStatistics = gql`
    query allDataQueries($type: LwpStaticDataQueryType, $status: LwpStaticQueryStatus) {
        allDataQueries(type: $type, status: $status) {
            id
            name
            lastCsvGenerated
            csvFileLocation
            description
        }
    }
`;

const refreshDataQuery = gql`
    mutation refreshDataQuery($id: String!) {
        refreshDataQuery(id: $id)
    }
`;

const ExportStatistics = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const [search, setSearch] = useState('');

    const {
        loading: adminQueriesLoading,
        error: error,
        data: adminQueries
    } = useQuery(allAdminQueriesForExportStatistics, {
        variables: {
            type: ADMIN,
            status: 'PUBLISHED'
        }
    });

    const [refreshDataQueryMutation, { loading: refreshDataQueryLoading }] = useMutation(refreshDataQuery, {
        refetchQueries: [
            {
                query: allAdminQueriesForExportStatistics,
                variables: {
                    type: ADMIN,
                    status: 'PUBLISHED'
                }
            }
        ],
        awaitRefetchQueries: true
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _onClick = (id) => {
        refreshDataQueryMutation({
            variables: {
                id
            }
        })
            .then(() => {
                callSnackbar('Query refreshed!', 'success');
            })
            .catch(({ ...err }) => {
                callSnackbar(err, 'error');
            });
    };

    const _onDownload = (id) => {
        const adminQuery = (adminQueries?.allDataQueries || []).find((query) => query?.id === id);

        if (adminQuery) {
            window.location.href = adminQuery?.csvFileLocation;
        }
    };

    const head = [
        {
            accessor: 'col1',
            Header: 'Query Name',
            tooltip: true
        },
        {
            accessor: 'col2',
            Header: 'Last CSV Generated',
            width: '200',
            Cell: ({ value }) => (value ? showDate({ date: value, time: true }) : '-'),
            sortType: (a, b) => sortingDate(a.original?.col2, b.original?.col2)
        },
        {
            accessor: 'col3',
            Header: ''
        }
    ];

    const filteredQueries = (adminQueries?.allDataQueries || []).filter((adminQuery) =>
        (adminQuery?.name || '').toLowerCase().includes(search.trim().toLowerCase())
    );

    const Row = filteredQueries.map((adminQuery) => {
        return {
            id: adminQuery?.id,
            col1: (
                <Grid container justifyContent={'space-between'} alignItems={'center'}>
                    <Grid item>{processText(adminQuery?.name)}</Grid>
                    <Grid item>{adminQuery?.description && <CommonTooltipIcon text={adminQuery?.description} />}</Grid>
                </Grid>
            ),
            col2: adminQuery?.lastCsvGenerated,
            col3: (
                <Grid container alignItems={'center'}>
                    <Grid>
                        <CommonIconButton
                            toolTipTitle={'Refresh'}
                            disabled={refreshDataQueryLoading}
                            onClick={() => _onClick(adminQuery?.id)}
                            icon={'refresh'}
                        />
                    </Grid>
                    <Grid>
                        <CommonIconButton
                            toolTipTitle={adminQuery?.csvFileLocation ? 'Download' : 'Query returned no results'}
                            disabled={(!adminQuery?.lastCsvGenerated && '-') || !adminQuery?.csvFileLocation}
                            onClick={() => _onDownload(adminQuery?.id)}
                            icon={adminQuery?.csvFileLocation ? 'file_download' : 'file_download_off'}
                        />
                    </Grid>
                </Grid>
            )
        };
    });

    if (adminQueriesLoading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'export-data-page'}>
            <Grid container>
                <InputField
                    value={search}
                    startIcon={'search'}
                    placeholder={'Search by query name'}
                    onChange={(e) => setSearch(e.target.value)}
                    name={'search'}
                    xs={12}
                    sm={12}
                    md={4}
                    lg={4}
                />
            </Grid>
            <CommonDraggableTable rows={Row} columns={head} />
        </div>
    );
};

export default ExportStatistics;
