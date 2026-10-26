import { gql, useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { STATUS_CODES } from '../../shared/Constant';
import { getTopicType, ThemeContext } from '../../shared/Services/handler';
import LinkExpiredPage from '../LinkExpiredPage';
import LinkInvalidPage from '../LinkInvalidPage';
import RatingStar from './../../components/Parent/RatingStar';
import ChildCard from './../../components/Shared/Cards/ChildCard';
import CommonCard from './../../components/Shared/Cards/CommonCard';
import VideoCard from './../../components/Shared/Cards/VideoCard';
import CommonLoading from './../../components/Shared/CommonLoading';
import MathScotWithBubbleText from './../../components/Shared/MathScotWithBubbleText';
import NameValue from './../../components/Shared/NameValue';
import VideoTroubleshootingDialog from '../Shared/VideoTroubleshootingDialog';

// Queries

const getDemoTopic = gql`
    query getDemoTopic($id: String!, $magicLink: String) {
        getDemoTopic(id: $id, magicLink: $magicLink) {
            parentTopicName
            teacherTopicName
            video
            videoThumb
            noVideo
            isReading
            isDemo
            isHidden
            activities {
                id
                name
                cardImage
            }
        }
    }
`;

const TopicDemo = () => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar, setHeaderTitle } = useContext(ThemeContext);
    const [showLinkInvalidPage, setShowLinkInvalidPage] = useState(false);
    const [showLinkExpiredPage, setShowLinkExpiredPage] = useState(false);

    const {
        loading: getDemoTopicIsLoading,
        error: getDemoTopicError,
        data: demoTopic
    } = useQuery(getDemoTopic, {
        variables: { id: queryParams?.topic_id, magicLink: searchParams.get('magicLink') },
        skip: !queryParams?.topic_id
    });

    useEffect(() => {
        setHeaderTitle(
            demoTopic?.getDemoTopic?.parentTopicName?.length > 0
                ? demoTopic?.getDemoTopic?.parentTopicName
                : demoTopic?.getDemoTopic?.teacherTopicName
        );
    }, [demoTopic]);

    useEffect(() => {
        const statusCode =
            getDemoTopicError?.graphQLErrors?.[0]?.extensions?.exception?.status || getDemoTopicError?.networkError?.statusCode;

        if (statusCode === STATUS_CODES.INVALID_MAGIC_LINK) {
            setShowLinkInvalidPage(true);
        } else if (statusCode === STATUS_CODES.EXPIRED_MAGIC_LINK) {
            setShowLinkExpiredPage(true);
        } else {
            getDemoTopicError?.message && callSnackbar(getDemoTopicError, 'error');
        }
    }, [getDemoTopicError]);

    if (getDemoTopicIsLoading) return <CommonLoading />;

    if (showLinkInvalidPage) return <LinkInvalidPage />;

    if (showLinkExpiredPage) return <LinkExpiredPage />;

    const isSingleActivity = demoTopic?.getDemoTopic?.activities?.length === 1;
    const activityWord = isSingleActivity ? 'activity' : 'activities';
    const activityPhrase = isSingleActivity ? 'the activity' : 'one or more of the activities';

    return (
        <div className="view-topic-container">
            <MathScotWithBubbleText
                heading={
                    demoTopic?.getDemoTopic?.parentTopicName?.length > 0
                        ? demoTopic?.getDemoTopic?.parentTopicName
                        : demoTopic?.getDemoTopic?.teacherTopicName
                }
                subHeading={
                    demoTopic?.getDemoTopic?.noVideo
                        ? `Try ${activityPhrase} with someone at home.`
                        : `Watch the video to remind yourself about this topic and then try ${activityPhrase} with someone at home.`
                }
                headingClass="my8 hide-on-mobile"
            />
            {!demoTopic?.getDemoTopic?.noVideo && (
                <div className="video_container">
                    {demoTopic?.getDemoTopic?.video ? (
                        <VideoCard
                            customClass="my6"
                            showPlayIcon
                            playing
                            type={getTopicType(demoTopic?.getDemoTopic?.isReading)}
                            controls={true}
                            videoLink={demoTopic?.getDemoTopic?.video}
                            isShowVideoTroubleshooting={true}
                        />
                    ) : (
                        <CommonCard
                            cardContentClassName={`${getTopicType(demoTopic?.getDemoTopic?.isReading)}-color no_video_card`}
                            className={'mein_no_video_card'}>
                            <div className="star">
                                <RatingStar stars={1} />
                            </div>

                            <NameValue
                                customClass="card_details"
                                h1
                                primaryText="There is no video here yet"
                                secondaryText={`New content is being filmed. Please continue with the ${activityWord} below.`}
                            />
                        </CommonCard>
                    )}
                </div>
            )}

            <div className={`topic-activity-cards${demoTopic?.getDemoTopic?.noVideo ? ' topic-activity-cards--sbt' : ''}`}>
                <Grid container spacing={3}>
                    {(demoTopic?.getDemoTopic?.activities || []).map((staticActivity) => {
                        return (
                            <ChildCard
                                key={staticActivity?.id}
                                activeBorder
                                popup
                                sideLayout
                                childName={staticActivity?.name}
                                childImg={staticActivity?.cardImage}
                                type={getTopicType(demoTopic?.getDemoTopic?.isReading)}
                                cardHandler={() =>
                                    router?.push({
                                        pathname: `/activitydemo/${staticActivity?.id}`,
                                        query: searchParams.get('magicLink') ? { magicLink: searchParams.get('magicLink') } : {}
                                    })
                                }
                            />
                        );
                    })}
                </Grid>
            </div>
        </div>
    );
};

export default TopicDemo;
