/* eslint-disable @next/next/no-img-element */

import { useLazyQuery, useMutation } from '@apollo/client';
import { Alert, Grid, useMediaQuery, useTheme } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import gql from 'graphql-tag';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { ADMIN, MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, TOPICACCESS } from '../../../shared/Constant';
import { getTopicType, ThemeContext } from '../../../shared/Services/handler';
import Paragraph from '../Typography/Paragraph';
import RatingStar from './../../Parent/RatingStar';
import LWPButton from './../../Shared/Button/LWPButton';
import ChildCard from './../../Shared/Cards/ChildCard';
import CommonCard from './../../Shared/Cards/CommonCard';
import VideoCard from './../../Shared/Cards/VideoCard';
import MathScotWithBubbleText from './../../Shared/MathScotWithBubbleText';
import NameValue from './../../Shared/NameValue';

// Mutations

const unlockTopicActivitiesMutation = gql`
    mutation unlockTopicActivities($id: String!) {
        unlockTopicActivities(id: $id)
    }
`;

const CommonTopicPreview = ({
    topic,
    childId,
    topicId,
    watchedTopicVideo,
    watchedVideo,
    activities,
    pupilActivities,
    pupilName,
    readOnly,
    setViewActivity,
    isPreview,
    cusRefetchQueries,
    silverStars,
    classTopic,
    isPupilTopicInPreviousAcademicYear,
    classTopicId
}) => {
    const router = useRouter();
    const { token } = useContext(ThemeContext);
    const queryParams = useParams();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const [unlockTopicActivities] = useMutation(unlockTopicActivitiesMutation, {
        refetchQueries: cusRefetchQueries,
        awaitRefetchQueries: true
    });

    const isAllowed = () => [TOPICACCESS, MAGICPARENT, PARENT, ADMIN].includes(token?.userType);

    const clickOnVideo = () => {
        if (!watchedVideo && isAllowed()) {
            watchedTopicVideo();
            if (window?.Cypress) return;
            if (window?.__vimeoRefresh) window?.__vimeoRefresh();
        }
    };

    const isSingleActivity = pupilActivities ? activities?.length === 1 : topic?.activities?.length === 1;
    const activityWord = isSingleActivity ? 'activity' : 'activities';

    const isSingleActivityReadyTeddy = topic?.isReadyTeddyTopic && isSingleActivity;

    useEffect(() => {
        if (topic?.noVideo && !watchedVideo && watchedTopicVideo && [TOPICACCESS, MAGICPARENT, PARENT, ADMIN].includes(token?.userType)) {
            watchedTopicVideo();
        }
    }, [topic?.noVideo, watchedVideo, watchedTopicVideo, token?.userType]);

    const isLocked = () => {
        return readOnly ? (
            ''
        ) : (!watchedVideo || !silverStars) && activities?.length ? (
            <div className="topic-activity-overlay-container">
                <div className="unlock-activities-container">
                    <div className="unlock-activities-image ">
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/grey_outlined_uncheck_star_2.svg`}
                            alt="grey_star"
                            width={92}
                            height={92}
                        />
                    </div>

                    {!watchedVideo ? (
                        <div className="unlock-activities-text">
                            <Paragraph centerText>
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-lock.svg`}
                                    alt="grey_star"
                                    width={27}
                                    height={27}
                                />
                                {`Watch the video to unlock the ${activityWord}.`}
                            </Paragraph>
                        </div>
                    ) : (
                        <LWPButton
                            dataTest={'unlock-activities-button'}
                            btnText={`Unlock ${activityWord}`}
                            onClick={() => unlockTopicActivities({ variables: { id: queryParams?.topic_id } })}
                            startIcon={
                                <img
                                    src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-unlock.svg`}
                                />
                            }
                        />
                    )}
                </div>
            </div>
        ) : (
            ''
        );
    };

    return (
        <>
            {isPupilTopicInPreviousAcademicYear ? (
                <Grid item style={{ paddingTop: isDesktop ? '32px' : '0px', paddingBottom: isDesktop ? '0px' : '32px' }}>
                    <Alert severity={'warning'} icon={<HelpOutlineIcon />}>
                        {`You’re viewing content from a previous academic year.`}
                    </Alert>
                </Grid>
            ) : null}
            <MathScotWithBubbleText
                heading={topic?.parentTopicName?.length > 0 ? topic?.parentTopicName : topic?.teacherTopicName}
                subHeading={`${readOnly ? 'Pupil name' : pupilName} has been given this topic to try at home. ${
                    topic?.noVideo ? `Do the ${activityWord} to earn stars.` : `Watch the video then do the ${activityWord} to earn stars.`
                }`}
                headingClass="my8 hide-on-mobile"
            />
            <div className="teacher_message_container">
                <MathScotWithBubbleText
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/koala_teacher_message.png`}
                    bubbleText={classTopic?.teacherMessage}
                />
            </div>
            {!topic?.noVideo && (
                <div className="video_container" data-test="topic-video-container">
                    {topic?.video ? (
                        <VideoCard
                            customClass="my6"
                            type={getTopicType(topic?.isReading)}
                            controls={true}
                            showPlayIcon
                            playing
                            videoLink={topic?.video}
                            onClick={clickOnVideo}
                            isShowVideoTroubleshooting={true}
                        />
                    ) : (
                        <CommonCard
                            cardContentClassName={`${getTopicType(topic?.isReading)}-color no_video_card`}
                            className={'mein_no_video_card'}>
                            {!isPreview && (
                                <div className="star">
                                    <RatingStar stars={1} value={watchedVideo} readOnly={true} watchedVideo={watchedVideo} />
                                </div>
                            )}

                            <NameValue
                                customClass="card_details"
                                h1
                                primaryText="There is no video here yet"
                                secondaryText={`New content is being filmed. Please continue with the ${activityWord} below.`}
                            />
                            {clickOnVideo()}
                        </CommonCard>
                    )}
                </div>
            )}
            <div
                className={`topic-activity-cards${topic?.noVideo ? ' topic-activity-cards--sbt' : ''}`}
                data-test={topic?.noVideo ? 'topic-activity-cards-sbt' : 'topic-activity-cards'}>
                <Grid
                    container
                    spacing={3}
                    justifyContent={isSingleActivityReadyTeddy ? 'center' : undefined}
                    className={readOnly ? '' : !watchedVideo || !silverStars ? 'blur' : ''}>
                    {pupilActivities
                        ? (activities || []).map((pupilActivity) => {
                              const { activity } = pupilActivity;

                              return (
                                  <ChildCard
                                      dataTest={`child-activity-card`}
                                      key={activity?.id}
                                      activeBorder
                                      readOnly
                                      popup
                                      sideStar
                                      stars={1}
                                      starPosition={2}
                                      childName={activity?.name}
                                      childImg={activity?.cardImage}
                                      starValue={pupilActivity?.earnedStar}
                                      type={getTopicType(topic?.isReading)}
                                      cardHandler={() => {
                                          childId && topicId ? router?.push(`/activity/${pupilActivity?.id}`) : '';
                                          //   childId && topicId ? router?.push(`/activity/${pupilActivity?.id}?parent_id=${parentId}`) : '';
                                      }}
                                  />
                              );
                          })
                        : (topic?.activities || []).map((pupilActivity) => {
                              return (
                                  <ChildCard
                                      key={pupilActivity?.id}
                                      activeBorder
                                      readOnly
                                      popup
                                      sideStar
                                      stars={1}
                                      starPosition={2}
                                      childName={pupilActivity?.name}
                                      childImg={pupilActivity?.cardImage}
                                      starValue={pupilActivity?.earnedStar}
                                      type={getTopicType(topic?.isReading)}
                                      cardHandler={() =>
                                          setViewActivity
                                              ? setViewActivity(pupilActivity?.id)
                                              : router?.push(
                                                    `/previewactivity/${pupilActivity?.id}${classTopicId ? `?classTopicId=${classTopicId}` : ''}`
                                                )
                                      }
                                  />
                              );
                          })}
                </Grid>
                {isPreview && (
                    <div className="close-preview-button">
                        <LWPButton customClass="close-button" btnText="Close window" onClick={() => window.close()} loading={false} />
                    </div>
                )}
                {isLocked()}
            </div>
        </>
    );
};

CommonTopicPreview.propTypes = {
    topic: PropTypes.object.isRequired,
    classTopic: PropTypes.object,
    childId: PropTypes.string,
    topicId: PropTypes.string,
    readOnly: PropTypes.bool,
    watchedTopicVideo: PropTypes.func,
    watchedVideo: PropTypes.bool,
    activities: PropTypes.array,
    cusRefetchQueries: PropTypes.array,
    pupilActivities: PropTypes.bool,
    isPupilTopicInPreviousAcademicYear: PropTypes.bool,
    isPreview: PropTypes.bool,
    setViewActivity: PropTypes.func,
    pupilName: PropTypes.string,
    silverStars: PropTypes.number,
    classTopicId: PropTypes.string
};

CommonTopicPreview.defaultProps = {
    topic: {},
    isPreview: false,
    isPupilTopicInPreviousAcademicYear: false
};

export default CommonTopicPreview;
