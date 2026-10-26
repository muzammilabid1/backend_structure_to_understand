import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import Breadcrumb from '../../../components/Parent/Breadcrumb';
import { ADMIN, MAGICPARENT, PARENT } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import SurveyModal from '../../Shared/Modals/SurveyModal';
import CommonLoading from './../../Shared/CommonLoading';
import CommonTopicPreview from './../../Shared/CommonTopicPreview';

// Queries

const getPupilTopicForViewTopic = gql`
    query getPupilTopic($id: String!) {
        getPupilTopic(id: $id) {
            id
            watchedVideo
            earnedGoldStar
            silverStars
            isInPreviousAcademicYear
            classTopic {
                teacherMessage
            }
            pupil {
                id
                fullname
                firstname
                lastname
            }
            activities {
                id
                earnedStar
                activity {
                    id
                    name
                    cardImage
                }
            }
            topic {
                id
                parentTopicName
                teacherTopicName
                video
                videoThumb
                teacherDescription
                isReading
                isReadyTeddyTopic

                noVideo
                activities {
                    id
                    name
                    cardImage
                    starValue
                    activityType
                }
            }
        }
    }
`;

const getUserForViewTopic = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            type
        }
    }
`;

// Mutation

const pupilWatchedTopicVideoForViewTopic = gql`
    mutation pupilWatchedTopicVideo($id: String!) {
        pupilWatchedTopicVideo(id: $id) {
            id
        }
    }
`;

const pupilTopicOpenedForViewTopic = gql`
    mutation pupilTopicOpened($id: String!) {
        pupilTopicOpened(id: $id)
    }
`;

// Component

const ViewTopic = () => {
    const { setHeaderTitle, callSnackbar, setChildDetails, userId, setParentPath } = useContext(ThemeContext);

    const [openSurveyModal, setOpenSurveyModal] = useState(false);
    const searchParams = useSearchParams();
    const queryParams = useParams();
    const router = useRouter();

    const [watchedVideoMutation] = useMutation(pupilWatchedTopicVideoForViewTopic, {
        refetchQueries: [{ query: getPupilTopicForViewTopic, variables: { id: queryParams?.topic_id } }],
        awaitRefetchQueries: true
    });

    const [pupilTopicOpenedMutation] = useMutation(pupilTopicOpenedForViewTopic);

    const {
        loading,
        error,
        data: pupilTopic
    } = useQuery(getPupilTopicForViewTopic, {
        variables: { id: queryParams?.topic_id }
    });

    const {
        error: getUserError,
        data: user,
        loading: getUserLoading
    } = useQuery(getUserForViewTopic, {
        variables: { id: userId }
    });

    useEffect(() => {
        if (pupilTopic) {
            let pupilId = pupilTopic?.getPupilTopic?.pupil?.id;

            setParentPath(`/child/${pupilId}`);
            setChildDetails({ id: pupilTopic?.getPupilTopic?.pupil?.id, firstname: pupilTopic?.getPupilTopic?.pupil?.firstname });
            setHeaderTitle(
                pupilTopic?.getPupilTopic?.topic?.parentTopicName?.length > 0
                    ? pupilTopic?.getPupilTopic?.topic?.parentTopicName
                    : pupilTopic?.getPupilTopic?.topic?.teacherTopicName
            );
        }
    }, [pupilTopic]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        getUserError?.message && callSnackbar(getUserError, 'error');
    }, [error, getUserError]);

    useEffect(() => {
        if (queryParams?.topic_id) {
            pupilTopicOpenedMutation({ variables: { id: queryParams?.topic_id } }).catch((error) => callSnackbar(error, 'error'));
        }
    }, [queryParams]);

    useEffect(() => {
        if (searchParams.get('optedOut') === 'true') {
            setOpenSurveyModal(true);
        }
    }, [searchParams]);

    // Stable reference required — inline arrow would cause the auto-watch useEffect
    // in CommonTopicPreview to fire on every render
    const watchedTopicVideo = useCallback(() => {
        watchedVideoMutation({ variables: { id: queryParams?.topic_id } }).catch((error) => callSnackbar(error, 'error'));
    }, [watchedVideoMutation, queryParams?.topic_id, callSnackbar]);

    const breadcrumbLists = [
        {
            homeIcon: true,
            route: [ADMIN, PARENT, MAGICPARENT].includes(user?.getUser?.type)
                ? `/parent/${user?.getUser?.id}`
                : `/child/${pupilTopic?.getPupilTopic?.pupil?.id}`
        },
        {
            label: pupilTopic?.getPupilTopic?.pupil?.fullname,
            route: `/child/${pupilTopic?.getPupilTopic?.pupil?.id}`
        },
        {
            label:
                pupilTopic?.getPupilTopic?.topic?.parentTopicName?.length > 0
                    ? pupilTopic?.getPupilTopic?.topic?.parentTopicName
                    : pupilTopic?.getPupilTopic?.topic?.teacherTopicName
        }
    ];

    if (loading || getUserLoading) return <CommonLoading />;

    return (
        <div className="view-topic-container">
            <Breadcrumb breadcrumbLists={breadcrumbLists} customClass="hide-on-mobile" />

            <CommonTopicPreview
                classTopic={pupilTopic?.getPupilTopic?.classTopic}
                pupilName={pupilTopic?.getPupilTopic?.pupil?.firstname}
                pupilActivities
                activities={pupilTopic?.getPupilTopic?.activities}
                watchedTopicVideo={watchedTopicVideo}
                watchedVideo={pupilTopic?.getPupilTopic?.watchedVideo}
                topic={pupilTopic?.getPupilTopic?.topic}
                childId={pupilTopic?.getPupilTopic?.pupil?.id}
                topicId={queryParams?.topic_id}
                parentId={router?.query?.parent_id}
                cusRefetchQueries={[{ query: getPupilTopicForViewTopic, variables: { id: queryParams?.topic_id } }]}
                silverStars={pupilTopic?.getPupilTopic?.silverStars}
                isPupilTopicInPreviousAcademicYear={pupilTopic?.getPupilTopic?.isInPreviousAcademicYear}
            />
            {openSurveyModal && (
                <SurveyModal
                    open={openSurveyModal}
                    setOpen={setOpenSurveyModal}
                    feedbackRedirectUrl={`/topic/${queryParams?.topic_id}`}
                    viewType={PARENT}
                />
            )}
        </div>
    );
};

export default ViewTopic;
