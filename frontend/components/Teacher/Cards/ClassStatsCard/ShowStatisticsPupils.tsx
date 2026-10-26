import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { PupilStatus } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import CommonDot from '../../../Shared/CommonDot';
import Paragraph from '../../../Shared/Typography/Paragraph';

const getSchoolClassStatisticsPupils = gql`
    query getSchoolClassStatisticsPupils($classId: String!, $status: String!) {
        getSchoolClassStatisticsPupils(classId: $classId, status: $status)
    }
`;

export interface props {
    color: string;
    count: number;
    status: string;
}

interface ShowStatisticsPupilsProps {
    data: props;
}

const ShowStatisticsPupils = ({ data }: ShowStatisticsPupilsProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const { query } = useRouter();

    const [loading, setLoading] = useState(false);

    const [schoolClassStatisticsPupilsQuery, { error, data: pupilNames }] = useLazyQuery(getSchoolClassStatisticsPupils, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            schoolClassStatisticsPupilsQuery({ variables: { classId: query?.class_id, status: data?.status } })?.finally(() => {
                setLoading(false);
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [data]);

    return (
        <div>
            {!loading && pupilNames ? (
                <>
                    <Grid container alignItems="center">
                        <CommonDot color={data?.color} />
                        <Paragraph
                            style={{ fontWeight: 'bold' }}
                            text={
                                data?.status === PupilStatus?.ACTIVE
                                    ? 'Active this term'
                                    : data?.status === PupilStatus?.MISSING
                                      ? 'No linked parent'
                                      : 'Accessed the site'
                            }
                        />
                    </Grid>

                    {pupilNames?.getSchoolClassStatisticsPupils?.length > 0
                        ? (pupilNames?.getSchoolClassStatisticsPupils || [])?.map((pupil) => (
                              <Paragraph style={{ margin: '15px 0' }} text={pupil} />
                          ))
                        : '(None)'}
                </>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowStatisticsPupils;
