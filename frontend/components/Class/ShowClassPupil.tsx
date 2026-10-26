import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../shared/Services/handler';
import Paragraph from '../Shared/Typography/Paragraph';

// Queries
const getClassPupils = gql`
    query getClassPupils($classId: String!) {
        getClassPupils(classId: $classId) {
            fullname
        }
    }
`;

interface ShowClassPupilProps {
    classId: string;
}

const ShowClassPupil = ({ classId }: ShowClassPupilProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getPupilTopicProgressQuery, { loading, error, data, called }] = useLazyQuery(getClassPupils, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getPupilTopicProgressQuery({ variables: { classId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>{data?.getClassPupils?.map((pupil) => <Paragraph text={pupil?.fullname} />)}</>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowClassPupil;
