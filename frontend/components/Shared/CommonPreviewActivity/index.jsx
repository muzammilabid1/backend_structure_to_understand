import { gql, useQuery } from '@apollo/client';
import { useRouter } from 'next/compat/router';
import { useParams } from 'next/navigation';
import React, { useContext, useEffect } from 'react';

import { getActivityForPreview } from '../../../graphQl/queries';
import { MINIO_PUBLIC_PATHS, TEACHER } from '../../../shared/Constant';
import { getActivityComponentName, getTopicType, ThemeContext } from '../../../shared/Services/handler';
import { filterStepsForViewer } from '../../../shared/Services/stepVisibility';
import LWPButton from './../Button/LWPButton';
import CommonActivityPreview from './../CommonActivityPreview';
import CommonLoading from './../CommonLoading';
import MathScotWithBubbleText from './../MathScotWithBubbleText';
import RenderStaticActivies from './../StaticActivityViews/RenderStaticActivies';

const getSetByTeacherStepsForTopicQuery = gql`
    query getSetByTeacherStepsForTopic($topicId: String!, $classTopicId: String, $isReleased: Boolean!) {
        getSetByTeacherStepsForTopic(topicId: $topicId, classTopicId: $classTopicId, isReleased: $isReleased) {
            stepId
            filename
            parentMessage
        }
    }
`;

/**
 * The tag ids of the viewing teacher's own school, and nothing else.
 *
 * The school is resolved on the server from the token's subject, so nothing school or A/B
 * related has to live in the JWT, which is decoded on every route.
 */
const getViewerSchoolTagIdsQuery = gql`
    query getTeacherSchool {
        getTeacherSchool {
            id
            tagIds
        }
    }
`;

const CommonPreviewActivity = () => {
    const queryParams = useParams();
    const router = useRouter();
    const { callSnackbar, token } = useContext(ThemeContext);

    const classTopicId = router?.query?.classTopicId || null;

    const {
        loading: getActivityIsLoading,
        error: error,
        data: activity
    } = useQuery(getActivityForPreview, {
        variables: { id: queryParams?.activity_id }
    });

    const staticTopicId = activity?.getActivityForPreview?.topic?.id;

    const { data: sbtData } = useQuery(getSetByTeacherStepsForTopicQuery, {
        variables: { topicId: staticTopicId, classTopicId, isReleased: true },
        skip: !classTopicId || !staticTopicId
    });

    /*
        Skipped for everyone but a teacher, and deliberately on user type rather than on
        "is there a token". This page is reachable by any authenticated user (the activity
        it previews reads through AdminWriteAllRead, which allows every type to read), but
        getTeacherSchool is TeacherOnly and would fail authorization for a parent, putting
        an error over a page that otherwise worked.

        Skipping it for an admin is also what keeps the admin preview showing every step,
        with no user type branching in the filter itself.
    */
    const { data: viewerSchoolData, loading: viewerSchoolIsLoading } = useQuery(getViewerSchoolTagIdsQuery, {
        skip: token?.userType !== TEACHER
    });

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
    }, [error]);

    // Held until the school tags have arrived as well, so a step a tag should hide never
    // renders first and disappears a moment later.
    if (getActivityIsLoading || viewerSchoolIsLoading) return <CommonLoading />;

    const activityData = activity?.getActivityForPreview;

    const sbtMediaByStepId = {};
    for (const step of sbtData?.getSetByTeacherStepsForTopic ?? []) {
        if (step.filename) {
            sbtMediaByStepId[step.stepId] = { filename: step.filename, parentMessage: step.parentMessage ?? null };
        }
    }

    /*
        Teachers see exactly what their pupils will (LEA-6559), so the school tag rules apply
        here just as they do on the parent activity page.

        The filter runs whatever the viewer, rather than only when a class topic is in view:
        most routes into this page carry no classTopicId at all (the topic library and the
        schedule page both open it bare), and gating on one would leave the tag rules off on
        exactly those routes. The set-by-teacher rule still needs a class topic, so its media
        is what stays conditional.

        If the school query fails, schoolTagIds is undefined and no step is hidden by a tag.
        That degrades to the behaviour before this change rather than hiding steps from every
        teacher on a transient error.
    */
    const filteredActivityData = activityData
        ? {
              ...activityData,
              steps: {
                  ...activityData.steps,
                  legacySteps: filterStepsForViewer(activityData.steps?.legacySteps, {
                      schoolTagIds: viewerSchoolData?.getTeacherSchool?.tagIds,
                      sbtMediaByStepId: classTopicId ? sbtMediaByStepId : undefined
                  })
              }
          }
        : activityData;

    return (
        <div className="view-activity-container">
            <MathScotWithBubbleText
                image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/activity-child.png`}
                bubbleText={activityData?.welcomeMessage}
            />
            {activityData?.activityType === 'STATIC' ? (
                <RenderStaticActivies
                    activityComponentName={getActivityComponentName(activityData?.details)}
                    type={getTopicType(activityData?.topic?.isReading)}
                    readOnly={true}
                />
            ) : (
                <CommonActivityPreview
                    activity={filteredActivityData}
                    readOnly={true}
                    sbtMediaByStepId={classTopicId ? sbtMediaByStepId : undefined}
                />
            )}

            <div className="activity-preview-buttons">
                <LWPButton
                    btnText="Return to topic"
                    onClick={() => router?.push(`/previewtopic/${staticTopicId}${classTopicId ? `?classTopicId=${classTopicId}` : ''}`)}
                    loading={false}
                />
            </div>
        </div>
    );
};

export default CommonPreviewActivity;
