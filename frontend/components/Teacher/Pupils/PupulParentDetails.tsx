import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress, Grid } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { capitalizeFirstLetter, countWithPlural, ThemeContext } from '../../../shared/Services/handler';
import Heading2 from '../../Shared/Typography/Heading2';
import Paragraph from '../../Shared/Typography/Paragraph';

// Queries
const getParentInfoOfPupil = gql`
    query getParentInfoOfPupil($pupilId: String!, $pupilParentStatus: PupilParentStatus!) {
        getParentInfoOfPupil(pupilId: $pupilId, pupilParentStatus: $pupilParentStatus) {
            fullname
            email
            phoneNumber
        }
    }
`;

interface PupulParentDetailsProps {
    id: string;
    type: string;
}

const PupulParentDetails = ({ id, type }: PupulParentDetailsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const pupilParentStatus = {
        ACTIVE: 'ACTIVE',
        INVITED: 'INVITED',
        IMPORTED: 'NOT YET INVITED',
        REJECTED: 'REJECTED'
    };

    const [getParentInfoOfPupilQuery, { loading, error, data, called }] = useLazyQuery(getParentInfoOfPupil, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getParentInfoOfPupilQuery({ variables: { pupilId: id, pupilParentStatus: type } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>
                    <Grid mb={2}>
                        <Heading2
                            text={countWithPlural(
                                capitalizeFirstLetter(`${pupilParentStatus[type]} parent`),
                                data.getParentInfoOfPupil.length,
                                false
                            )}
                            fontSize="14px"
                        />
                    </Grid>

                    {data?.getParentInfoOfPupil?.map((pupil, index) => (
                        <Grid mb={index !== data.getParentInfoOfPupil.length - 1 ? 1 : 0} key={index}>
                            <Paragraph text={pupil?.fullname} />
                        </Grid>
                    ))}
                </>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default PupulParentDetails;
