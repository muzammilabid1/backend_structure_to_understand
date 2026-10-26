import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import { useContext, useEffect, useMemo } from 'react';

import { showDate, ThemeContext } from '../../../../shared/Services/handler';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';

interface FeedbackEditHistoryLogsProps {
    feedbackId: string;
}

const getPupilFeedbackHistoryLogs = gql`
    query getPupilFeedbackHistoryLogs($feedbackId: String!) {
        getPupilFeedbackHistoryLogs(feedbackId: $feedbackId) {
            id
            logCreatedAt
            userName
        }
    }
`;

const FeedbackEditHistoryLogs = ({ feedbackId }: FeedbackEditHistoryLogsProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [fetchPupilFeedbackHistoryLogs, { data, loading, error, called }] = useLazyQuery(getPupilFeedbackHistoryLogs);

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error, callSnackbar]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPupilFeedbackHistoryLogs({ variables: { feedbackId } });
        }, 500);

        return () => clearTimeout(timer);
    }, [feedbackId]);

    const editHistoryLogs = useMemo(
        (): { id: string; logCreatedAt: Date; userName: string }[] => data?.getPupilFeedbackHistoryLogs ?? [],
        [data?.getPupilFeedbackHistoryLogs]
    );

    return (
        <div>
            {!loading && called && data ? (
                <div>
                    <Heading3 text="Edit history" />
                    {editHistoryLogs?.map((log) => (
                        <div key={log?.id}>
                            <Paragraph text={`${showDate({ date: log?.logCreatedAt, fullDateTime: true })} - ${log?.userName}`} />
                        </div>
                    ))}
                </div>
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default FeedbackEditHistoryLogs;
