import { gql, useQuery } from '@apollo/client';
import { Grid, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import { getRecommendedPupilTopicsForTodoTopicLists } from '../../graphQl/queries';
import { MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, SCRAPBOOK, TOPIC, TOPICACCESS, TV_IMAGE } from '../../shared/Constant';
import { getTopicType, handleErrorSnackbar, showDate, ThemeContext } from '../../shared/Services/handler';
import { ReadyTeddyTopicForScrapbook } from '../../types/entities/IPupil';
import CommonStatus from '../Shared/CommonStatus';
import SurveyModal from '../Shared/Modals/SurveyModal';
import ActivityAddChild from './../Shared/Cards/ActivityAddChild';
import ChildCard from './../Shared/Cards/ChildCard';

const getUserForRecommendedPupilTopics = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            type
            showInterstitial {
                id
                name
            }
        }
    }
`;

interface RecommendedPupilTopicsProps {
    currentReadyTeddyTopicForScrapbook?: ReadyTeddyTopicForScrapbook;
}

const RecommendedPupilTopics = ({ currentReadyTeddyTopicForScrapbook }: RecommendedPupilTopicsProps) => {
    const theme = useTheme();
    const { callSnackbar, userId } = useContext(ThemeContext);
    const router = useRouter();
    const queryParams = useParams();

    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isHome = router?.pathname === '/child/[child_id]';

    const [openSurveyModal, setOpenSurveyModal] = useState(false);

    const childId = queryParams?.child_id;

    const { error: getUserError, data: user } = useQuery(getUserForRecommendedPupilTopics, {
        variables: { id: userId },
        skip: !router?.isReady,
        fetchPolicy: 'cache-first'
    });

    const {
        error: errorR,
        data: recommendedPupilTopics,
        loading
    } = useQuery(getRecommendedPupilTopicsForTodoTopicLists, {
        variables: { id: childId },
        skip: !router?.isReady,
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, errorR);
        handleErrorSnackbar(callSnackbar, getUserError);
    }, [errorR, getUserError]);

    const getDate = (date) => {
        if (showDate({ date })?.includes('Wednesday')) {
            return showDate({ date, short: true });
        }

        return showDate({ date });
    };

    const getHeading = (topic) => {
        if (topic?.pupil?.school?.hideSubjectNames && !topic?.topic?.isReading) {
            return 'Next Topic';
        }

        return getTopicType(topic?.topic?.isReading) === TOPIC ? (topic.silverStars > 1 ? 'Why not try' : 'Up next') : 'We read together';
    };

    const daysRemaining = (readingTarget: number, silverStars: number, earnedGoldStar: boolean): string => {
        if (earnedGoldStar) return 'Target reached! ⭐';
        if (readingTarget === 0) return 'No target this week';
        const count = (readingTarget ?? 5) - silverStars;

        return count > 0 ? `${count} more to go` : 'Target reached! ⭐';
    };

    const showActivity = (topic, type) => {
        const activity = topic?.activities?.find((item) => !item.feedbacks?.length);

        if (!type && topic?.topic?.isReading)
            return topic?.topic?.parentTopicName?.length > 0 ? topic?.topic?.parentTopicName : topic?.topic?.teacherTopicName;

        if (type) {
            return activity?.activity.cardImage;
        } else {
            return activity?.activity.name;
        }
    };

    const handleRoute = (topic) => {
        if (topic?.topic?.isReading) {
            router
                ?.push({ pathname: `/child/${childId}/reading`, query: { topicId: topic?.id } }, undefined, { scroll: false })
                .then(() => {
                    const tabListContainer = document.querySelector('div[id="commonTabsWrapper"]');

                    if (tabListContainer) {
                        tabListContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                });

            return;
        }

        router?.push(`/topic/${topic?.id}`);
    };

    return (
        <>
            <Grid container className="pt4" spacing={3}>
                {user?.getUser?.showInterstitial?.id && [TOPICACCESS, MAGICPARENT, PARENT].includes(user?.getUser?.type) ? (
                    <ActivityAddChild
                        customClass="survey_card"
                        type={'surveyCard'}
                        // popup
                        onClick={() => setOpenSurveyModal(!openSurveyModal)}
                        childImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/pupil_without_round_bg1.png`}
                        headingText={user?.getUser?.showInterstitial?.name ?? 'Survey'}
                        btnText="Start survey"
                    />
                ) : null}

                {!recommendedPupilTopics?.getRecommendedPupilTopics?.length && isMobile && isHome ? (
                    <CommonStatus
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mathscot-thinking.png`}
                        imageAlt={''}
                        className="no-topics"
                        heading="No topics yet"
                        subHeading="You'll see topics here when your teacher sets them"
                    />
                ) : (
                    ''
                )}

                {!loading ? (
                    <>
                        {(recommendedPupilTopics?.getRecommendedPupilTopics || []).map((topic) => {
                            const activityRemaining = topic?.activities?.filter((item) => !item.feedbacks?.length);

                            if (isMobile && !isHome) return;

                            return (
                                <ChildCard
                                    check={false}
                                    key={topic.id}
                                    activeBorder
                                    heading={getHeading(topic)}
                                    imageContainerClass="reading_img"
                                    readOnly
                                    popup
                                    childName={
                                        topic?.topic?.parentTopicName?.length > 0
                                            ? topic?.topic?.parentTopicName
                                            : topic?.topic?.teacherTopicName
                                    }
                                    childImg={topic.silverStars > 0 ? showActivity(topic, true) : topic?.topic?.videoThumb}
                                    videoLink={topic?.topic?.noVideo ? null : topic?.topic?.video}
                                    tv={topic.silverStars === 0 && TV_IMAGE}
                                    type={getTopicType(topic?.topic?.isReading)}
                                    cardHandler={() => {
                                        handleRoute(topic);
                                    }}
                                    dateText={
                                        !topic?.topic?.isReading && topic.silverStars > 1
                                            ? `${activityRemaining?.length} more activities`
                                            : topic?.classTopic?.dueDate
                                              ? `Due on ${showDate({ date: topic?.classTopic?.dueDate })}`
                                              : topic?.topic?.isReading
                                                ? daysRemaining(topic?.readingTarget, topic?.silverStars, topic?.earnedGoldStar)
                                                : `Released ${getDate(topic.releaseDate)}`
                                    }
                                    dataTest={`recommended-pupil-topic`}
                                />
                            );
                        })}

                        {/**
                         *  This scrapbook prompt card will only be shown for the latest ready teddy topic when the pupil has not logged an entry for that prompt.
                         */}
                        {currentReadyTeddyTopicForScrapbook?.scrapbookPrompt && !currentReadyTeddyTopicForScrapbook?.haveScrapbookEntry && (
                            <ChildCard
                                check={false}
                                activeBorder
                                heading={'Scrapbook your moments'}
                                imageContainerClass="reading_img"
                                readOnly
                                popup
                                childName={'Suggestion'}
                                type={SCRAPBOOK}
                                cardHandler={() => {
                                    router?.push(`/scrapbook/${currentReadyTeddyTopicForScrapbook?.id}`);
                                }}
                                dateText={`“${currentReadyTeddyTopicForScrapbook?.scrapbookPrompt}”`}
                                dataTest={`scrapbook-prompt-card`}
                                className="scrapbook-card"
                            />
                        )}
                    </>
                ) : null}
            </Grid>
            {openSurveyModal && (
                <SurveyModal open={openSurveyModal} setOpen={setOpenSurveyModal} feedbackRedirectUrl={router?.asPath} viewType={PARENT} />
            )}
        </>
    );
};

export default RecommendedPupilTopics;
