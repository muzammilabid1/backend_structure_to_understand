import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import { useContext, useEffect, useMemo } from 'react';

import { ThemeContext } from '../../../../shared/Services/handler';
import Paragraph from '../../Typography/Paragraph';

interface FeedbackPupilsClasses {
    feedbackId: string;
}

const getFeedbackPupilsClasses = gql`
    query getFeedbackPupilsClasses($feedbackId: String!) {
        getFeedbackPupilsClasses(feedbackId: $feedbackId) {
            id
            name
        }
    }
`;

const FeedbackPupilsClasses = ({ feedbackId }: FeedbackPupilsClasses) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [fetchFeedbackPupilsClasses, { data, loading, error, called }] = useLazyQuery(getFeedbackPupilsClasses, {
        variables: { feedbackId }
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error, callSnackbar]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFeedbackPupilsClasses({ variables: { feedbackId } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const classes = useMemo<{ id: string; name: string }[]>(() => {
        return data?.getFeedbackPupilsClasses ?? [];
    }, [data]);

    if (loading) return <CircularProgress />;

    return (
        <div>
            {!loading && called && data ? (
                classes.map((schoolClass) => <Paragraph key={schoolClass.id} text={schoolClass.name} />)
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default FeedbackPupilsClasses;
