/* eslint-disable @typescript-eslint/no-explicit-any */
import { Grid } from '@mui/material';
import moment from 'moment';
import { useRouter } from 'next/compat/router';
import React from 'react';

import { PARENT } from '../../../../shared/Constant';
import MarkAsSeen from './MarkAsSeen';
import TeacherReply from './TeacherReply';
import TeacherStickers from './TeacherStickers';

type ActivityFeedReplyProps = {
    feedback: {
        logCreatedAt?: string;
        tickedBy?: string;
        userType?: string;
    };
    user: {
        school: {
            isParentFeedbackReplyFeatureEnabled?: boolean;
            isParentFeedbackStickerFeatureEnabled?: boolean;
            parentFeedbackTickFeatureEnabledAt?: string;
            id: string;
        };
    };
    getFirstTick: () => void;
    searchfeedInput: string;
    setFeeds: (feeds: any) => void;
    getFirstStickers: () => void;
    getFirstComment: () => void;
    showTickedAllFeedbackQuery: () => void;
};

const ActivityFeedReply = ({
    feedback,
    user,
    getFirstTick,
    searchfeedInput,
    setFeeds,
    getFirstStickers,
    getFirstComment,
    showTickedAllFeedbackQuery
}: ActivityFeedReplyProps) => {
    const router = useRouter();

    const isFeedAfterFeatureEnabled = (feedback, enabledAt) => moment(feedback?.logCreatedAt).isSameOrAfter(moment(enabledAt));

    const isTeacherOrAdminOnReadingPage = () =>
        [
            '/pupil/[pupil_id]/reading',
            '/feed/[user_id]',
            '/school/[school_id]/feed',
            '/class/[class_id]/readingweek',
            '/class/[class_id]/topic'
        ]?.some((path) => router.pathname.includes(path));

    const isFeedbackReply = user?.school?.isParentFeedbackReplyFeatureEnabled;
    const isFeedbackSticker = user?.school?.isParentFeedbackStickerFeatureEnabled;
    const isFeedbackTick = isFeedAfterFeatureEnabled(feedback, user?.school?.['parentFeedbackTickFeatureEnabledAt']);

    const shouldRenderComponent = (
        featureEnabledAt: string,
        isFeatureEnabled: boolean,
        Component: React.ElementType,
        componentProps: object,
        fullWidth = false,
        description = null
    ) => {
        const showDescription = isDescription(featureEnabledAt);

        return isTeacherOrAdminOnReadingPage() && feedback?.userType === PARENT && isFeatureEnabled ? (
            fullWidth ? (
                <Grid mb="24px" width={'100%'}>
                    <Component {...componentProps} />
                </Grid>
            ) : (
                <Grid mb="24px" display={'flex'} alignItems={'center'} gap={2}>
                    <Component {...componentProps} hoverDescription={showDescription ? null : description} />
                    {showDescription ? description : null}
                </Grid>
            )
        ) : null;
    };

    const isDescription = (featureEnabledAt) => {
        if (isFeedbackReply) {
            return false;
        }

        if (isFeedbackTick && !feedback?.tickedBy && isFeedbackSticker) {
            return false;
        }

        if (featureEnabledAt === 'parentFeedbackTickFeatureEnabledAt') {
            return !feedback?.tickedBy && isFeedbackTick;
        }

        return isFeedbackSticker;
    };

    return (
        <Grid className="activity-feed-reply" display="flex" gap={1} alignItems="center">
            {!feedback?.tickedBy &&
                shouldRenderComponent(
                    'parentFeedbackTickFeatureEnabledAt',
                    isFeedAfterFeatureEnabled(feedback, user?.school?.parentFeedbackTickFeatureEnabledAt),
                    MarkAsSeen,
                    {
                        getFirstTick,
                        searchfeedInput,
                        feedback,
                        setFeeds,
                        user,
                        showTickedAllFeedbackQuery
                    },
                    false,
                    'Award a tick. Parents will see the tick and who has ticked it.'
                )}
            {shouldRenderComponent(
                'isParentFeedbackStickerFeatureEnabled',
                user?.school?.isParentFeedbackStickerFeatureEnabled,
                TeacherStickers,
                {
                    setFeeds,
                    feedback,
                    getFirstStickers,
                    schoolId: user?.school?.id
                },
                false,
                'Award a sticker'
            )}
            {shouldRenderComponent(
                'isParentFeedbackReplyFeatureEnabled',
                user?.school?.isParentFeedbackReplyFeatureEnabled,
                TeacherReply,
                {
                    setFeeds,
                    feedback,
                    getFirstComment
                },
                true
            )}
        </Grid>
    );
};

export default ActivityFeedReply;
