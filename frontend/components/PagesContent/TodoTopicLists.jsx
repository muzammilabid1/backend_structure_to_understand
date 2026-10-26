import { useQuery } from '@apollo/client';
import { Grid } from '@mui/material';
import gql from 'graphql-tag';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { MINIO_PUBLIC_PATHS, TV_IMAGE } from '../../shared/Constant';
import { getTopicType, showDate } from '../../shared/Services/handler';
import { ThemeContext } from '../../shared/Services/handler';
import ChildCard from './../Shared/Cards/ChildCard';
import VideoCard from './../Shared/Cards/VideoCard';
import CommonLoading from './../Shared/CommonLoading';
import CommonStatus from './../Shared/CommonStatus';
import DialogWrapper from './../Shared/DialogWrapper';
import Heading2 from './../Shared/Typography/Heading2';

// Queries

export const getPupilTopicsForTodoTopicLists = gql`
    query getPupilTopics($id: String!) {
        getPupilTopics(id: $id) {
            id
            releaseDate
            silverStars
            earnedGoldStar
            watchedVideo
            readingTarget
            activities {
                id
                earnedStar
            }
            period {
                index
            }
            classTopic {
                dueDate
            }
            pupil {
                firstname
                lastname
                school {
                    curentPeriod {
                        index
                    }
                }
            }
            topic {
                id
                parentTopicName
                teacherTopicName
                videoThumb
                video
                noVideo
                isReading
            }
        }
    }
`;

const TodoTopicLists = ({ isVideoWatched, isMobile, isHome, isTopic }) => {
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);
    const childId = queryParams?.child_id;

    const {
        loading,
        error: error,
        data: pupilTopics
    } = useQuery(getPupilTopicsForTodoTopicLists, {
        fetchPolicy: 'cache-first',
        variables: { id: childId },
        skip: !router?.isReady
    });

    useEffect(() => {
        if (searchParams.get('oneChild')) {
            router?.beforePopState(({ as }) => {
                if (as !== router?.asPath) {
                    history.go(-1);
                }

                return true;
            });

            return () => {
                router?.beforePopState(() => true);
            };
        }
    }, [searchParams]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    if (loading) return <CommonLoading />;

    const onEnded = () => {
        setOpen(false);
    };

    const getWeek = (topic) => {
        const releaseWeek = moment(topic).isoWeekday(1).format('w');
        const currentWeek = moment().isoWeekday(1).format('w');
        const count = currentWeek - releaseWeek;

        if (count === 0) {
            return 'This week ';
        } else if (count === 1) {
            return 'Last week';
        } else {
            const date = showDate({ date: moment.utc(topic) });

            return `Week starting ${date}`;
        }
    };

    return (
        <>
            {pupilTopics?.getPupilTopics?.length && !isMobile ? <Heading2 text="All topics" /> : ''}

            <Grid container className="pt4" spacing={3}>
                {isMobile && !isHome && !pupilTopics?.getPupilTopics?.length ? (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        className="no-topics"
                        dataTest="common-status-no-topics"
                        heading="No topics yet"
                        subHeading="You'll see topics here when your teacher sets them"
                    />
                ) : (
                    ''
                )}
                {(pupilTopics?.getPupilTopics || []).map((topic) => {
                    const activityRemaining = topic?.activities?.filter((item) => !item.earnedStar);

                    return (
                        <ChildCard
                            key={topic.id}
                            activeBorder
                            ratingStar
                            readOnly
                            popup
                            tv={TV_IMAGE}
                            childName={
                                topic?.topic?.parentTopicName?.length > 0 ? topic?.topic?.parentTopicName : topic?.topic?.teacherTopicName
                            }
                            isActivityCompleted={topic?.topic?.isReading ? topic?.earnedGoldStar : activityRemaining?.length === 0}
                            childImg={topic?.topic?.videoThumb}
                            videoLink={topic?.topic?.noVideo ? null : topic?.topic?.video}
                            readingTarget={topic?.readingTarget ?? 5}
                            activities={topic?.activities}
                            starValue={topic?.silverStars}
                            silverStars={topic?.silverStars}
                            earnedGoldStar={topic?.earnedGoldStar}
                            watchedVideo={topic?.watchedVideo}
                            type={getTopicType(topic?.topic?.isReading)}
                            cardHandler={() => {
                                topic?.topic?.isReading
                                    ? router?.push({
                                          pathname: `/child/${childId}/reading`,
                                          query: { topicId: topic?.id }
                                      })
                                    : router?.push(`/topic/${topic.id}`);
                            }}
                            dateText={
                                !topic?.topic?.isReading && topic.silverStars > 0
                                    ? `${
                                          activityRemaining?.length > 0
                                              ? `${activityRemaining?.length} more activities`
                                              : 'All activities done'
                                      } `
                                    : topic?.classTopic?.dueDate
                                      ? `Due on ${showDate({ date: topic?.classTopic?.dueDate })}`
                                      : topic?.topic?.isReading
                                        ? ` ${getWeek(topic.releaseDate)}`
                                        : ` ${showDate({ date: topic.releaseDate })}`
                            }
                        />
                    );
                })}
            </Grid>

            {!isTopic && !pupilTopics?.getPupilTopics?.length && (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                    imageAlt={''}
                    className="no-topics"
                    dataTest="common-status-no-topics"
                    heading="No topics yet"
                    subHeading="You'll see topics here when your teacher sets them"
                />
            )}

            {isMobile && pupilTopics?.getPupilTopics?.length && !isTopic && isVideoWatched ? (
                <CommonStatus
                    image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-yay.png`}
                    className="no-topics"
                    dataTest="common-status-no-topics"
                    imageAlt={''}
                    subHeading={'You are up to date - well done! You can find all the past topics by clicking on “Topics”.'}
                />
            ) : (
                ''
            )}

            <DialogWrapper className="intro_video" open={open} setOpen={setOpen}>
                <VideoCard onEnded={onEnded} controls={true} videoId={'356432913'} />
            </DialogWrapper>
        </>
    );
};

TodoTopicLists.propTypes = { isVideoWatched: PropTypes.bool, isMobile: PropTypes.bool, isHome: PropTypes.bool, isTopic: PropTypes.bool };

TodoTopicLists.defaultProps = {
    isMobile: false,
    isHome: false,
    isTopic: false
};

export default TodoTopicLists;
