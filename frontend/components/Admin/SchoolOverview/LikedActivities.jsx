import { useLazyQuery } from '@apollo/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getLikedActivityFeeds } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS } from '../../../shared/Constant';
import { getFeedbackType, ThemeContext } from '../../../shared/Services/handler';
import CommonActivityFeedCard from '../../Shared/Cards/CommonActivityFeedCard';
import CommonLoading from './../../Shared/CommonLoading';
import CommonStatus from './../../Shared/CommonStatus';

const LikedActivities = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [getLikedActivityFeedsQuery, { loading, error, data: likedActivities }] = useLazyQuery(getLikedActivityFeeds);
    const queryParams = useParams();

    const [showStatus, setShowStatus] = useState(false);

    useEffect(() => {
        if (queryParams?.school_id) getLikedActivityFeedsQuery({ variables: { id: queryParams?.school_id } });
    }, []);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    useEffect(() => {
        !loading && !likedActivities?.['getLikedActivityFeeds']?.length ? setShowStatus(true) : setShowStatus(false);
    }, [loading, likedActivities]);

    if (loading) return <CommonLoading />;

    return (
        <div className="other_layout_for_specific_pages activity-feed-container">
            {(likedActivities?.['getLikedActivityFeeds'] || []).map((feedback) => (
                <CommonActivityFeedCard
                    key={feedback?.id}
                    feedback={feedback}
                    activityContentImg={feedback?.photos?.[0]?.filename}
                    description={feedback?.description}
                    type={getFeedbackType(feedback?.type)}
                    classTitle={feedback?.activity?.topic?.classTopic?.class?.name}
                    classDate={feedback?.logCreatedAt}>
                    <p className="mb2">
                        <Link passHref href={`/pupil/${feedback?.pupil?.id}`}>
                            {feedback?.pupil?.fullname}
                        </Link>
                        {feedback?.description ? (
                            ' did their own activity'
                        ) : (
                            <>
                                {' '}
                                added comments to the <strong>{feedback?.activity?.activity?.name}</strong> activity in the{' '}
                                <Link
                                    passHref
                                    href={`/class/${feedback?.activity?.topic?.classTopic?.class?.id}/topic/${feedback?.activity?.topic?.id}`}>
                                    {feedback?.activity?.activity?.topic?.teacherTopicName}
                                </Link>{' '}
                                topic
                            </>
                        )}
                    </p>
                    <div className="">hello</div>
                </CommonActivityFeedCard>
            ))}
            {showStatus && (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={'liked activity'}
                    heading={'No liked activities to show'}
                    className="mt8"
                />
            )}
        </div>
    );
};

export default LikedActivities;
