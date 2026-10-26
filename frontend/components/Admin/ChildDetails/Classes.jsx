import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getPupilClassesForAdmin } from '../../../graphQl/queries';
import { adminPath } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import CommonDraggableTable from './../../Shared/CommonDraggableTable';
import CommonLoading from './../../Shared/CommonLoading';
import Paragraph from './../../Shared/Typography/Paragraph';

const TeacherClasses = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();

    const { loading, error, data: pupilClasses } = useQuery(getPupilClassesForAdmin, { variables: { id: queryParams?.child_id } });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const head = [
        {
            accessor: 'col1',
            Header: 'Class name',
            Cell: (params) => (
                <Link passHref href={`${adminPath}/class/${params?.row?.original?.id}`}>
                    <Paragraph customClass="arrow_cursor">{params?.row?.original?.col1}</Paragraph>
                </Link>
            )
        },
        { accessor: 'col2', Header: 'Year group' },
        { accessor: 'col3', Header: 'Main teacher' },
        { accessor: 'col4', Header: 'School' },
        { accessor: 'col5', Header: 'Academic year' }
    ];

    const row = (pupilClasses?.pupil?.classes || []).map((pupilClass) => {
        return {
            id: pupilClass.id,
            col1: pupilClass?.name,
            col2: pupilClass?.yearGroup?.year,
            col3: `${pupilClass?.mainTeacher?.firstname} ${pupilClass?.mainTeacher?.lastname}`,
            col4: pupilClass?.school?.schoolName,
            col5: pupilClass?.period?.shortName
        };
    });

    if (loading) return <CommonLoading />;

    return <CommonDraggableTable rows={row} columns={head} />;
};

export default TeacherClasses;
