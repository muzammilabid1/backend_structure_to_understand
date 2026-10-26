import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { FC, useContext, useEffect } from 'react';

import { handleErrorSnackbar, ThemeContext } from '../../../shared/Services/handler';
import Paragraph from '../Typography/Paragraph';

export const getPupilsByTagId = gql`
    query getPupilsByTagId($id: String!) {
        getPupilsByTagId(id: $id) {
            id
            fullname
            currentClassOrGroupAcrossClasses {
                name
            }
        }
    }
`;

interface IShowPupilsByPupilTagIdProps {
    id: string;
}

const ShowPupilsByPupilTagId: FC<IShowPupilsByPupilTagIdProps> = ({ id }) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getPupilsByTagIdProgressQuery, { loading, error, data, called }] = useLazyQuery(getPupilsByTagId, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, error);
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getPupilsByTagIdProgressQuery({ variables: { id } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (loading || !called) return <CircularProgress />;

    return (
        <Grid container flexDirection={'column'} spacing={2}>
            {data?.getPupilsByTagId?.map((pupil) => {
                return (
                    <Grid item key={pupil.id}>
                        <Paragraph text={pupil?.fullname} />
                        <Paragraph text={pupil.currentClassOrGroupAcrossClasses?.name} customClass="warm-grey-color" />
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default ShowPupilsByPupilTagId;
