/* eslint-disable @next/next/no-img-element */
import { Card } from '@mui/material';
import React from 'react';

import AudioPlayer from '../../Shared/AudioPlayer';

export interface ScrapbookMedia {
    id: string;
    filename: string;
}

export interface FeedbackReply {
    id: string;
    reply?: string | null;
    logCreatedAt?: string;
    logUpdatedAt?: string;
    originalFeedbackReplyId?: string | null;
    originalFeedbackReplyDeletedAt?: string | null;
    type?: string;
    sticker?: { alt?: string; imageUrl?: string } | null;
    logCreatedBy?: { nameForChildren?: string } | null;
}

export interface ScrapbookFeedback {
    id: string;
    comment?: string | null;
    logCreatedAt: string;
    userId?: string;
    photos?: ScrapbookMedia[];
    audios?: ScrapbookMedia[];
    userType?: string;
    feedbackReplies?: FeedbackReply[];
}

interface ScrapbookFeedbackCardProps {
    feedback: ScrapbookFeedback;
}

const ScrapbookFeedbackCard = ({ feedback }: ScrapbookFeedbackCardProps) => {
    const photo = feedback?.photos?.[0]?.filename;
    const audio = feedback?.audios?.[0]?.filename;
    const date = new Date(feedback.logCreatedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return (
        <Card className={`scrapbook-entry-card`}>
            {photo && (
                <div className="scrapbook-entry-photo">
                    <img src={photo} alt="Scrapbook memory" className="scrapbook-photo-img" />
                </div>
            )}

            {audio && (
                <div className="scrapbook-entry-audio">
                    <AudioPlayer variant="rich" src={audio} hide />
                </div>
            )}

            {feedback?.comment && <p className="scrapbook-entry-comment">{feedback.comment}</p>}

            <div className="scrapbook-entry-footer">
                <p className="scrapbook-entry-date">{date}</p>
            </div>
        </Card>
    );
};

export default ScrapbookFeedbackCard;
