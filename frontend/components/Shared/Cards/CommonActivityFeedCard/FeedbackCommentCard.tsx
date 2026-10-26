/* eslint-disable @next/next/no-img-element */
import { Card, CardContent, Grid } from '@mui/material';
import { ReactNode } from 'react';

import { MINIO_PUBLIC_PATHS } from '../../../../shared/Constant';

interface FeedbackCommentCardProps {
    children: ReactNode;
    className?: string;
    placement?: 'left' | 'right';
}

const FeedbackCommentCard = ({ children, className = '', placement = 'left' }: FeedbackCommentCardProps) => {
    return (
        <Grid item xs={12} className={`activity-feed-card feedback-comment-card ${className}`}>
            <Card className={`common_card`}>
                <CardContent>{children}</CardContent>
            </Card>
            <img
                src={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/speech-bubble-${placement}.svg`}
                className={`comment-card-speech-bubble`}
            />
        </Grid>
    );
};

export default FeedbackCommentCard;
