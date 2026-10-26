import { useQuery } from '@apollo/client';
import CloseIcon from '@mui/icons-material/Close';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { getPupilHistory } from '../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, READING } from '../../shared/Constant';
import { getFeedbackType, showDate, ThemeContext } from '../../shared/Services/handler';
import { HistoryCard } from '../Parent';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import Heading2 from './../Shared/Typography/Heading2';

const HistoryList = ({ onClose, child_id }) => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const { loading, error, data: pupilHistory } = useQuery(getPupilHistory, { variables: { pupilId: child_id } });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    const getTitle = (history) => {
        if (getFeedbackType(history?.type) === READING) {
            if (history?.isBookFinished) {
                return (
                    <>
                        You finished the book <b>{history?.bookName}</b>.
                    </>
                );
            } else {
                return (
                    <>
                        You read the book <b>{history?.bookName}</b> together
                        {history?.pageNumber && (
                            <>
                                {' '}
                                and got to Page <b>{history?.pageNumber}</b>
                            </>
                        )}
                        .
                    </>
                );
            }
        }

        return (
            <>
                You completed <b>{history?.activity?.activity?.name}</b> in the{' '}
                <b>
                    {history?.activity?.activity?.topic?.parentTopicName?.length > 0
                        ? history?.activity?.activity?.topic?.parentTopicName
                        : history?.activity?.activity?.topic?.teacherTopicName}
                </b>{' '}
                topic.
            </>
        );
    };

    return (
        <div className="history_bar">
            <div className="drawer-heading">
                <Heading2 text="History" />
                <span onClick={onClose}>
                    <CloseIcon />
                </span>
            </div>
            {!pupilHistory?.getPupilHistory.length ? (
                <CommonStatus
                    className="no_history"
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt="no history"
                    heading="Nothing to show here"
                    subHeading="Submit comments, audio or photos to add them to your history."
                />
            ) : (
                (pupilHistory?.getPupilHistory || []).map((history) => (
                    <HistoryCard
                        key={history?.id}
                        title={getTitle(history)}
                        date={showDate({ date: history?.logCreatedAt, year: true })}
                        starIcon={history?.activity?.earnedStar}
                        type={getFeedbackType(history?.type)}
                        onClick={() => router?.push(`/activity/${history?.activity?.id}`)}
                    />
                ))
            )}
        </div>
    );
};

HistoryList.propTypes = { onClose: PropTypes.func, child_id: PropTypes.string };

export default HistoryList;
