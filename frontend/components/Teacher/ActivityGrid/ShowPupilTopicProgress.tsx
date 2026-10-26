import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../../shared/Services/handler';
import CommonList from '../../Shared/CommonList';
import Paragraph from '../../Shared/Typography/Paragraph';

// Queries

const getPupilTopicProgressForShowPupilTopicProgress = gql`
    query getPupilTopicProgress($input: PupilTopicProgressInput!) {
        getPupilTopicProgress(input: $input) {
            text
            icon
        }
    }
`;

interface ShowPupilTopicProgressProps {
    pupilTopicId?: number;
    subject?: string;
    isReadingTopic?: boolean;
}

const ShowPupilTopicProgress = ({ pupilTopicId, isReadingTopic }: ShowPupilTopicProgressProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [getPupilTopicProgressQuery, { loading, error, data, called }] = useLazyQuery(getPupilTopicProgressForShowPupilTopicProgress, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getPupilTopicProgressQuery({ variables: { input: { id: pupilTopicId, isReadingTopic } } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <>
                    {isReadingTopic && data?.getPupilTopicProgress?.length === 0 ? (
                        <Paragraph text={'No reading logged this week'} />
                    ) : (
                        <CommonList list={data?.getPupilTopicProgress} />
                    )}
                </>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default ShowPupilTopicProgress;
