import { gql, useLazyQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';

import { processText, ThemeContext } from '../../../shared/Services/handler';
import CommonTooltipIcon from '../../Shared/CommonTooltipIcon';
import CommonIconButton from './../../Shared/Button/CommonIconButton';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import CommonTabs from './../../Shared/CommonTabs';
import InputField from './../../Shared/InputField/InputField';
import EditSchoolDataModal from './EditSchoolDataModal';

const allDataQueries = gql`
    query allDataQueries($type: LwpStaticDataQueryType, $status: LwpStaticQueryStatus) {
        allDataQueries(type: $type, status: $status) {
            id
            name
            category
            type
            description
            status
            order
        }
    }
`;

const DataQueries = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const [updatedValues, setUpdatedValues] = useState(null);
    const [active, setActive] = useState(0);
    const [search, setSearch] = useState('');

    const [allDataQuery, { loading: adminQueriesLoading, error: error, data: adminQueries }] = useLazyQuery(allDataQueries, {});

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        allDataQuery({
            variables: {
                type: active === 0 ? 'LEADER' : 'ADMIN'
            }
        });
    }, [active]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const tebs = ['School data queries', 'Admin data queries'];

    const head = [
        {
            accessor: 'col1',
            Header: 'Query Name',
            tooltip: true
        },
        {
            accessor: 'col2',
            Header: 'Type'
        },
        {
            accessor: 'col3',
            Header: 'Status'
        },
        ...(active === 0
            ? [
                  {
                      accessor: 'col4',
                      Header: 'Category'
                  }
              ]
            : []),
        {
            accessor: 'col5',
            Header: 'Order'
        },
        {
            accessor: 'col6',
            Header: '',
            width: '10'
        }
    ];

    const filteredQueries = (adminQueries?.allDataQueries || []).filter((adminQuery) =>
        (adminQuery?.name || '').toLowerCase().includes(search.trim().toLowerCase())
    );

    const Row = filteredQueries.map((adminQuery) => {
        return {
            id: adminQuery?.id,
            col1: processText(adminQuery?.name),
            col2: adminQuery?.type,
            col3: adminQuery?.status,
            col4: adminQuery?.category ?? '-',
            col5: adminQuery?.order ?? '-',
            col6: (
                <Grid container alignItems={'center'}>
                    <Grid item>
                        <CommonIconButton toolTipTitle={'Edit'} icon={'edit'} onClick={() => setUpdatedValues(adminQuery)} />
                    </Grid>
                    <Grid item>{adminQuery?.description && <CommonTooltipIcon text={adminQuery?.description} />}</Grid>
                </Grid>
            )
        };
    });

    return (
        <div data-test={'data-queries-page'}>
            <CommonTabs tebs={tebs} value={active} onChange={setActive} />
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

            {adminQueriesLoading ? <CommonLoading /> : <CommonDraggableTable rows={Row} columns={head} />}

            <EditSchoolDataModal updatedValues={updatedValues} setUpdatedValues={setUpdatedValues} allAdminQueries={allDataQueries} />
        </div>
    );
};

export default DataQueries;
