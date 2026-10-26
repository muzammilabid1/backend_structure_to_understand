/* eslint-disable @typescript-eslint/no-explicit-any */
import RestoreIcon from '@mui/icons-material/Restore';
import { Grid } from '@mui/material';
import moment from 'moment';
import React from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';
import { showDate } from '../../../../shared/Services/handler';
import CommonPopOver from '../../CommonPopOver';
import Heading3 from '../../Typography/Heading3';
import Paragraph from '../../Typography/Paragraph';
import CommonCard from '../CommonCard';
import ReplyOperations from './ReplyOperations';

interface FeedbackTickedAndRepliesProps {
    feedback: Record<string, any>;
    user?: {
        school: {
            isParentFeedbackReplyFeatureEnabled?: boolean;
            isParentFeedbackStickerFeatureEnabled?: boolean;
            parentFeedbackTickFeatureEnabledAt?: string;
            id: string;
        };
    };
    setFeeds?: (feeds: any) => void;
}

const FeedbackTickedAndReplies = ({ feedback, user, setFeeds }: FeedbackTickedAndRepliesProps) => {
    return (
        <>
            {feedback?.tickedBy ? (
                <CommonCard className="activity-feed-card feedback-ticked-by-container">
                    <Grid className="child-comment" display={'flex'} justifyContent={'center'} gap={1}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/mark_as_seen.svg`}
                            alt="mark-as-seen"
                        />
                        <Heading3 text={`- ${feedback?.tickedBy?.nameForChildren ?? 'Teacher'}${feedback?.tickedAt ? ' -' : ''}`} />
                        {feedback?.tickedAt ? (
                            <CommonPopOver
                                hover
                                childrenClass="activity-feedback-actions-info-popover"
                                element={
                                    <span className="feedback-ticked-at">
                                        <RestoreIcon fontSize="small" />
                                        <Paragraph text={moment(feedback?.tickedAt).fromNow().toLowerCase()} />
                                    </span>
                                }>
                                <Paragraph text={`Ticked on ${showDate({ date: feedback?.tickedAt, fullDateTime: true })}`} />
                            </CommonPopOver>
                        ) : null}
                    </Grid>
                </CommonCard>
            ) : null}

            {feedback?.feedbackReplies?.length > 0
                ? feedback?.feedbackReplies?.map((reply) => {
                      return <ReplyOperations user={user} reply={reply} setFeeds={setFeeds} feedback={feedback} />;
                  })
                : null}
        </>
    );
};

export default FeedbackTickedAndReplies;
