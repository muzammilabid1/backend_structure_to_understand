import { useLazyQuery, useMutation } from '@apollo/client';
import { Button, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { deleteDemoFeedback } from '../../../graphQl/mutations';
import { getAllDemoFeedsForAdmin } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, PAGINATION_ITEM_LIMIT } from '../../../shared/Constant';
import { getTopicType, ThemeContext } from '../../../shared/Services/handler';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import CommonLazyLoading from './../../Shared/CommonLazyLoading';
import CommonLoading from './../../Shared/CommonLoading';
import CommonStatus from './../../Shared/CommonStatus';

const AllDemoFeedsAdmin = () => {
    const searchParams = useSearchParams();
    const { token, callSnackbar } = useContext(ThemeContext);
    const [getAllDemoFeedsForAdminQuery, { loading, error, data: getDemoActivityAllFeeds }] = useLazyQuery(getAllDemoFeedsForAdmin, {
        fetchPolicy: 'network-only'
    });
    const [feeds, setFeeds] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showStatus, setShowStatus] = useState(false);

    const [deleteDemoFeedbackMutation, { loading: deleteDemoFeedbackLoading }] = useMutation(deleteDemoFeedback);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    const _fetchMore = () => {
        const feedInput = {};

        if (searchParams.get('IsOpen')) {
            setIsOpen(searchParams.get('IsOpen') === 'true');
        }

        token?.sub &&
            getAllDemoFeedsForAdminQuery({ variables: { offset: feeds.length, limit: PAGINATION_ITEM_LIMIT, filter: feedInput } });
    };

    useEffect(() => {
        if (token?.sub) {
            setFeeds([]);
            _fetchMore();
        }
    }, [token, searchParams]);

    useEffect(() => {
        if (!feeds.length && getDemoActivityAllFeeds?.getDemoActivityAllFeeds?.results) {
            setFeeds([...feeds, ...getDemoActivityAllFeeds.getDemoActivityAllFeeds.results]);
        }
    }, [getDemoActivityAllFeeds]);

    useEffect(() => {
        const newFeeds = getDemoActivityAllFeeds?.getDemoActivityAllFeeds?.results;

        if (feeds.length && newFeeds && newFeeds.length) {
            const oldFeeds = feeds[feeds.length - 1];
            const lastItemFromNewFeeds = newFeeds[newFeeds.length - 1];

            if (lastItemFromNewFeeds?.id !== oldFeeds?.id) {
                setFeeds([...feeds, ...newFeeds]);
            } else {
                setFeeds(newFeeds);
            }
        }
    }, [getDemoActivityAllFeeds]);

    useEffect(() => {
        !loading && !feeds.length ? setShowStatus(true) : setShowStatus(false);
    }, [loading, feeds]);

    return (
        <div className="other_layout_for_specific_pages">
            <CommonLazyLoading
                previousDataLength={feeds.length}
                hasMoreLoading={getDemoActivityAllFeeds?.getDemoActivityAllFeeds?.total !== feeds.length}
                fetchMore={_fetchMore}
                loadingContent={<CommonLoading />}>
                {(feeds || []).map((feed) => (
                    <CommonActivityFeedCard
                        key={feed?.id}
                        showSideImg={false}
                        previousDataLength={feeds.length}
                        feedback={feed}
                        lastFeedId={feeds?.[feeds.length - 1]?.id}
                        activityContentImg={feed?.photo}
                        type={getTopicType(feed?.activity?.topic?.isReading)}
                        classDate={feed?.logCreatedAt}
                        deleteDemoFeedbackMutation={deleteDemoFeedbackMutation}
                        deleteDemoFeedbackLoading={deleteDemoFeedbackLoading}
                        photoRating={feed?.photoRating}
                        setFeeds={setFeeds}
                        isDemoActivity={true}>
                        <p className="mb2">
                            Pupil
                            <>
                                {' '}
                                added comments to the <strong>{feed?.activity?.name}</strong> activity in the{' '}
                                {feed?.activity?.topic?.teacherTopicName} topic
                            </>
                        </p>
                    </CommonActivityFeedCard>
                ))}
            </CommonLazyLoading>
            {showStatus && (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    heading={'No activities to show'}
                />
            )}
        </div>
    );
};

export default AllDemoFeedsAdmin;
