/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import { gql, LazyQueryExecFunction, OperationVariables, useMutation } from '@apollo/client';
import { Grid } from '@mui/material';
import { FeatureTooltipTargets } from 'lwp-shared';
import moment from 'moment';
import { useParams } from 'next/navigation';
import React, { useContext } from 'react';

import { ADMIN, MINIO_PUBLIC_PATHS, PARENT, TEACHER } from '../../../../shared/Constant';
import { handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import LWPButton from '../../Button/LWPButton';
import Heading2 from '../../Typography/Heading2';
import Paragraph from '../../Typography/Paragraph';
import CommonCard from '../CommonCard';

const markFeedbacksAsTicked = gql`
    mutation markFeedbacksAsTicked($feedbackId: String!, $schoolId: String!) {
        markFeedbacksAsTicked(feedbackId: $feedbackId, schoolId: $schoolId)
    }
`;

const markAllFeedbacksAsTicked = gql`
    mutation markAllFeedbacksAsTicked($teacherId: String, $filter: PupilActivityFeedsFilterInput, $pupilId: String, $schoolId: String!) {
        markAllFeedbacksAsTicked(teacherId: $teacherId, filter: $filter, pupilId: $pupilId, schoolId: $schoolId)
    }
`;

interface MarkAsSeenProps {
    feedback: Record<string, any>;
    setFeeds: React.Dispatch<React.SetStateAction<any[]>>;
    setTickedAllFeedsLoading: React.Dispatch<boolean>;
    allFeeds: any[];
    showAllTick: boolean;
    searchfeedInput: any;
    getFirstTick: Record<string, any>;
    user: any;
    isAllTick: boolean;
    showTickedAllFeedbackQuery: LazyQueryExecFunction<any, OperationVariables>;
    userId?: string;
}

const MarkAsSeen = ({
    feedback,
    setFeeds,
    allFeeds,
    showAllTick,
    searchfeedInput,
    getFirstTick,
    user,
    isAllTick = false,
    showTickedAllFeedbackQuery,
    setTickedAllFeedsLoading,
    userId
}: MarkAsSeenProps) => {
    const { token, callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const pupilId = queryParams?.child_id || queryParams?.pupil_id;

    const [addAsMarkMutation, { loading }] = useMutation(markFeedbacksAsTicked);
    const [markAllFeedbackAsReadMutation, { loading: markAllFeedbackLoading }] = useMutation(markAllFeedbacksAsTicked);

    const isFeedAfterTickFeatureEnabled = (feedback) => {
        return moment(feedback?.logCreatedAt).isSameOrAfter(moment(user?.school?.parentFeedbackTickFeatureEnabledAt));
    };

    const markFeedbacksAsTickedHandler = async () => {
        const params = { schoolId: user?.school?.id };
        const nameForChildren = token.userType === ADMIN ? `${token?.firstName} ${token?.lastName}` : user?.nameForChildren;

        if (pupilId) {
            params['pupilId'] = pupilId;
        } else if (searchfeedInput) {
            const feedInput = searchfeedInput();

            params['teacherId'] = userId;
            params['filter'] = feedInput;
        }

        try {
            await addAsMarkMutation({
                variables: {
                    feedbackId: feedback.id,
                    schoolId: user?.school?.id
                }
            });

            if (showTickedAllFeedbackQuery && (pupilId || userId)) {
                await showTickedAllFeedbackQuery({
                    variables: params
                });
            }

            setFeeds((prev) => {
                const prerItem = structuredClone(prev);

                const item = prerItem.find((feed) => feed.id === feedback.id);

                if (item) {
                    item.tickedBy = { nameForChildren };
                    item.tickedAt = new Date();
                }

                return prerItem;
            });
        } catch (error) {
            handleErrorSnackbar(callSnackbar, error);
        }
    };

    const markAllFeedbacksAsTickedHandler = async () => {
        const params = { schoolId: user?.school?.id };

        const filterOnlytickable = allFeeds?.filter(
            (feed) => !feed.tickedBy && isFeedAfterTickFeatureEnabled(feed) && feed?.userType === PARENT
        );

        const nameForChildren = token.userType === ADMIN ? `${token?.firstName} ${token?.lastName}` : user?.nameForChildren;

        if (pupilId) {
            params['pupilId'] = pupilId;
        } else {
            const feedInput = searchfeedInput();

            params['teacherId'] = userId;
            params['filter'] = feedInput;
        }

        try {
            if (setTickedAllFeedsLoading) {
                setTickedAllFeedsLoading(true);
            }

            await markAllFeedbackAsReadMutation({
                variables: params
            });

            await showTickedAllFeedbackQuery({
                variables: params
            });

            setFeeds((prev: any) => {
                return prev.map((feed: any) => {
                    if (filterOnlytickable.some((item) => item.id === feed.id)) {
                        return {
                            ...feed,
                            tickedBy: { nameForChildren },
                            tickedAt: new Date()
                        };
                    } else {
                        return feed;
                    }
                });
            });
        } catch (error) {
            handleErrorSnackbar(callSnackbar, error);
        } finally {
            if (setTickedAllFeedsLoading) {
                setTickedAllFeedsLoading(false);
            }
        }
    };

    return isAllTick ? (
        <CommonCard
            cardClassName="caught_up_on_container"
            sx={{
                marginBottom: {
                    xs: 8,
                    md: 2
                }
            }}>
            <img
                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/new_tick_on_feedbackasd.svg`}
                alt="tick all feedbacks"
                className="caught_up_on_feedback"
            />
            <Heading2 text="You’re all caught up" centerText customClass="caught_up_on_heading" />
            <Paragraph
                text="You've reviewed all the current feedback. There are some unticked entries remaining."
                centerText
                customClass="caught_up_on_para"
            />
            <Grid container justifyContent={'center'}>
                <LWPButton
                    id={FeatureTooltipTargets.TICK_ALL_FEEDBACK_AS_READ}
                    onClick={async () => {
                        if (showAllTick && !markAllFeedbackLoading && [TEACHER, ADMIN]?.includes(token?.userType)) {
                            await markAllFeedbacksAsTickedHandler();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                    }}
                    btnText="Tick all"
                />
            </Grid>
        </CommonCard>
    ) : [TEACHER, ADMIN]?.includes(token?.userType) ? (
        <img
            className="mark_as_seen"
            id={getFirstTick?.id === feedback?.id ? FeatureTooltipTargets.TICK_SINGLE_FEEDBACK_AS_READ : `${feedback?.id}-tick`}
            onClick={() => {
                if (!loading) {
                    markFeedbacksAsTickedHandler();
                }
            }}
            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/new_tick_on_feedback.svg`}
            alt="tick single feedback"
            width={38}
            height={28}
        />
    ) : null;
};

export default MarkAsSeen;
