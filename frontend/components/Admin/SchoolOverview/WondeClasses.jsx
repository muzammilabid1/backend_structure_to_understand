/* eslint-disable react/display-name */
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getWondeClasses } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import Paragraph from './../../Shared/Typography/Paragraph';

const WondeClasses = ({ schoolId }) => {
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error, data } = useQuery(getWondeClasses, { variables: { id: schoolId } });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    let heading = ['Class name', 'Class code', 'Year group', 'Period'];

    let head = heading.map((head, index) => {
        let rowHead = { accessor: `col${index + 1}`, Header: head };

        if (head === 'Class name') {
            rowHead.Cell = (params) => (
                <Link passHref href={`${adminPath}/wondeclass/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor" text={params?.row?.original?.col1} />
                </Link>
            );
        }

        return rowHead;
    });

    const row = (data?.getSchool?.importedSchool?.classes || []).map((_class) => {
        return {
            id: _class.id,
            col1: _class?.name,
            col2: _class?.code,
            col3: _class?.yearGroup?.year,
            col4: _class?.period?.longName ?? '-'
        };
    });

    if (loading) return <CommonLoading />;

    return (
        <div className="mt8">
            <CommonDraggableTable customClass="row-height" rows={row} columns={head} />
        </div>
    );
};

WondeClasses.propTypes = { schoolId: PropTypes.string };

export default WondeClasses;
