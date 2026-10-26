import { gql, useLazyQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import moment from 'moment';
import React, { useContext, useEffect } from 'react';

import { ThemeContext } from '../../../../shared/Services/handler';
import PupilReadingHistoryPopover from './PupilReadingHistoryPopover';
import { HeadItem, Topic } from './ReadingCompactView';

interface PupilReadingHistoryProps {
    topic: Topic;
    date: HeadItem;
}

export const getPupilFeedbacksByTopicIdAndbookReadAt = gql`
    query getPupilFeedbacksByTopicIdAndbookReadAt($pupilTopicId: String!, $bookReadAt: DateTime!) {
        getPupilFeedbacksByTopicIdAndbookReadAt(pupilTopicId: $pupilTopicId, bookReadAt: $bookReadAt) {
            bookName
            userName
            pageNumber
            userType
            comment
            bookReadAt
            isBookFinished
            pupilCount
            logCreatedAt
            pupilTopic {
                id
                releaseDate
            }
        }
    }
`;

const PupilReadingHistory = ({ date, topic }: PupilReadingHistoryProps) => {
    const feedback = topic?.feedbacks?.find((feedback) => {
        return feedback?.bookReadAt && moment(feedback.bookReadAt).format('dddd').slice(0, 3) === date?.code;
    });

    const { callSnackbar } = useContext(ThemeContext);

    const [getPupilFeedbacksProgressQuery, { loading, error, data, called }] = useLazyQuery(getPupilFeedbacksByTopicIdAndbookReadAt, {
        fetchPolicy: 'network-only'
    });

    useEffect(() => {
        if (error?.message) {
            callSnackbar(error, 'error');
        }
    }, [error]);

    useEffect(() => {
        const timer = setTimeout(() => {
            getPupilFeedbacksProgressQuery({ variables: { bookReadAt: feedback?.bookReadAt, pupilTopicId: topic?.id } });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {!loading && called && data ? (
                <PupilReadingHistoryPopover item={data?.getPupilFeedbacksByTopicIdAndbookReadAt} name={topic?.pupil.fullname} />
            ) : (
                <CircularProgress />
            )}
        </div>
    );
};

export default PupilReadingHistory;
