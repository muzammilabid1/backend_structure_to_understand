/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation } from '@apollo/client';
import CircleIcon from '@mui/icons-material/Circle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RestoreIcon from '@mui/icons-material/Restore';
import { Grid } from '@mui/material';
import { Formik } from 'formik';
import { FeedbackReplyType } from 'lwp-shared';
import moment from 'moment';
import React, { useContext, useState } from 'react';

import { getShortRelativeTime, showDate, ThemeContext } from '../../../../shared/Services/handler';
import { teacherCommentValidation } from '../../../../shared/validations';
import LWPButton from '../../Button/LWPButton';
import CommonListWithIcon from '../../CommonListWithIcon';
import CommonPopOver from '../../CommonPopOver';
import InputField from '../../InputField/InputField';
import ConfirmationModal from '../../Modals/ConfirmationModal';
import UpdateReplyStickersModal from '../../Modals/UpdateReplyStickersModal';
import Heading1 from '../../Typography/Heading1';
import Paragraph from '../../Typography/Paragraph';
import FeedbackCommentCard from './FeedbackCommentCard';

const updateFeedBackReply = gql`
    mutation updateFeedBackReply($input: UpdateFeedbackReplyInput!) {
        updateFeedBackReply(input: $input) {
            id
            reply
            logCreatedAt
            logUpdatedAt
            sticker {
                id
                alt
                imageUrl
            }
        }
    }
`;

const removeFeedbackReply = gql`
    mutation removeFeedbackReply($id: String!) {
        removeFeedbackReply(id: $id) {
            originalFeedbackReplyId
            originalFeedbackReplyDeletedAt
            type
            logCreatedBy {
                id
                nameForChildren
            }
        }
    }
`;

interface ReplyOperationsProps {
    feedback: Record<string, any>;
    reply: Record<string, any>;
    setFeeds?: (feeds: any) => void;
    user?: {
        school: {
            isParentFeedbackReplyFeatureEnabled?: boolean;
            isParentFeedbackStickerFeatureEnabled?: boolean;
            parentFeedbackTickFeatureEnabledAt?: string;
            id: string;
        };
    };
}

const operationInitialState = {
    isEditReply: false,
    isEditSticker: false,
    isDelete: false
};

const ReplyOperations = ({ reply, setFeeds, feedback, user }: ReplyOperationsProps) => {
    const { token, callSnackbar } = useContext(ThemeContext);

    const [operations, setOperations] = useState(operationInitialState);

    const [updateFeedBackReplyMutation, { loading: updateFeedBackReplyLoading }] = useMutation(updateFeedBackReply);
    const [removeFeedbackReplyMutation, { loading: removeFeedbackReplyLoading }] = useMutation(removeFeedbackReply);

    const onClose = () => {
        if (!updateFeedBackReplyLoading) setOperations(operationInitialState);
    };

    const addNewsListItem = [
        {
            text: 'Edit',
            icon: 'edit',
            onClick: () => {
                setOperations({
                    ...operationInitialState,
                    isEditReply: !!reply?.reply,
                    isEditSticker: !!reply?.sticker
                });
            }
        },
        {
            text: 'Delete',
            icon: 'delete',
            onClick: () => {
                setOperations({
                    ...operationInitialState,
                    isDelete: true
                });
            }
        }
    ];

    const handleDelete = async () => {
        try {
            const { data } = await removeFeedbackReplyMutation({
                variables: {
                    id: reply?.id
                }
            });

            setFeeds((prev) => {
                return prev.map((feed) => {
                    if (feed?.id === feedback?.id) {
                        return {
                            ...feed,
                            feedbackReplies: feed?.feedbackReplies?.map((feedbackReplie) =>
                                feedbackReplie?.id === reply?.id ? { ...reply, ...data?.removeFeedbackReply } : feedbackReplie
                            )
                        };
                    }

                    return feed;
                });
            });

            onClose();
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    const handleUpdateReply = async ({ comment, stickerId }: { comment?: string; stickerId?: string }) => {
        try {
            const input: {
                id: string;
                stickerId?: string;
                reply?: string;
            } = {
                id: reply?.id
            };

            if (comment) input.reply = comment?.trim();

            if (stickerId) input.stickerId = stickerId;

            const { data: updateFeedbackReplyData } = await updateFeedBackReplyMutation({
                variables: {
                    input
                }
            });

            setFeeds((prev) => {
                return prev.map((feed) => {
                    if (feed?.id === feedback?.id) {
                        return {
                            ...feed,
                            feedbackReplies: feed?.feedbackReplies.map((feedbackReplie) =>
                                feedbackReplie?.id === reply?.id
                                    ? {
                                          ...feedbackReplie,
                                          ...updateFeedbackReplyData?.updateFeedBackReply
                                      }
                                    : feedbackReplie
                            )
                        };
                    }

                    return feed;
                });
            });
            onClose();
        } catch (err) {
            callSnackbar(err, 'error');
        }
    };

    /**
     * If both values are not same it's mean the reply is updated
     */
    const isReplyUpdated = !moment(reply?.logCreatedAt).isSame(moment(reply?.logUpdatedAt));

    /**
     * Return the latest created or updated time
     */
    const isReplyCreatedAtOrUpdatedAt = isReplyUpdated ? reply?.logUpdatedAt : reply?.logCreatedAt;

    return (
        <div data-test={`feedback-${reply?.type}`} className="replied-card-container">
            {reply?.originalFeedbackReplyId ? (
                <div className="reply-deleted-container">
                    <CommonPopOver
                        hover
                        transformOriginHorizontal="center"
                        childrenClass="activity-feedback-actions-info-popover"
                        element={
                            <div className="reply-deleted-at">
                                <span>
                                    <InfoOutlinedIcon fontSize="small" />
                                    <Paragraph
                                        text={`A ${reply?.type === FeedbackReplyType.STICKER ? 'sticker' : 'reply'} has been deleted.`}
                                    />
                                </span>
                            </div>
                        }>
                        <Paragraph
                            text={`Deleted on ${showDate({ date: reply?.originalFeedbackReplyDeletedAt, fullDateTime: true })} - ${reply?.logCreatedBy?.nameForChildren ?? 'Teacher'}`}
                            dataTest="deleted-feedback-entry"
                        />
                    </CommonPopOver>
                </div>
            ) : (
                <FeedbackCommentCard className={`feedback-comment-card-right ${reply?.sticker ? 'sticker_content' : ''}`} placement="right">
                    <Grid container justifyContent={'space-between'} gap={1} flexWrap="nowrap">
                        <Grid>
                            {operations.isEditReply ? (
                                <Heading1 text={`Edit reply`} />
                            ) : (
                                <Grid className="replied-info" display={'flex'} alignItems={'end'} flexWrap="wrap">
                                    <Heading1 text={reply?.logCreatedBy?.nameForChildren ?? 'Teacher'} />
                                    <div>
                                        <p className="replied_to_comment">
                                            {reply?.sticker ? 'sent you a sticker ' : 'replied to comment '}
                                            <CircleIcon fontSize="small" />
                                        </p>
                                        <CommonPopOver
                                            hover
                                            element={
                                                <span className="replied-at">
                                                    <RestoreIcon fontSize="small" />
                                                    <Paragraph
                                                        text={`${isReplyUpdated ? 'Edited ' : ''}${getShortRelativeTime(isReplyCreatedAtOrUpdatedAt)}`}
                                                    />
                                                </span>
                                            }
                                            childrenClass="activity-feedback-actions-info-popover">
                                            <Grid container flexDirection={'column'} gap={0.5}>
                                                {isReplyUpdated ? (
                                                    <Grid>
                                                        <Paragraph
                                                            text={`Edited on ${showDate({ date: reply?.logUpdatedAt, fullDateTime: true })}`}
                                                        />
                                                    </Grid>
                                                ) : null}
                                                <Grid>
                                                    <Paragraph
                                                        text={`${reply?.sticker ? 'Sent' : 'Replied'} on ${showDate({ date: reply?.logCreatedAt, fullDateTime: true })}`}
                                                    />
                                                </Grid>
                                            </Grid>
                                        </CommonPopOver>
                                    </div>
                                </Grid>
                            )}
                        </Grid>
                        {reply?.logCreatedBy?.id === token?.sub && setFeeds ? (
                            <Grid xs={1} display={'flex'} justifyContent={'flex-end'}>
                                <CommonPopOver className="feedback-reply-action-popover" icon="more_vert">
                                    <CommonListWithIcon list={addNewsListItem} />
                                </CommonPopOver>
                            </Grid>
                        ) : null}
                    </Grid>

                    {reply?.sticker && (
                        <div className="replied-sticker">
                            <img
                                src={reply?.sticker?.imageUrl}
                                alt={reply?.sticker?.alt}
                                height={200}
                                width={190}
                                style={{ objectFit: 'contain', marginTop: '8px' }}
                            />
                        </div>
                    )}

                    {operations.isEditReply ? (
                        <Formik
                            initialValues={{ comment: reply?.reply }}
                            enableReinitialize
                            validationSchema={teacherCommentValidation}
                            onSubmit={(values) => handleUpdateReply(values)}>
                            {({ values, handleChange, handleSubmit, handleBlur }) => {
                                return (
                                    <Grid>
                                        <br />
                                        <InputField
                                            lg={12}
                                            md={12}
                                            multiline
                                            name="comment"
                                            label="Reply..."
                                            value={values?.comment}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />
                                        <Grid container gap={2} justifyContent={'end'}>
                                            <LWPButton variant="text" onClick={onClose} btnText="Cancel" color="inherit" size="medium" />
                                            <LWPButton
                                                btnText="Save"
                                                loading={updateFeedBackReplyLoading}
                                                onClick={handleSubmit}
                                                size="medium"
                                            />
                                        </Grid>
                                    </Grid>
                                );
                            }}
                        </Formik>
                    ) : (
                        <Paragraph dataTest="feedback-reply" customClass="feedback-reply" text={reply?.reply} />
                    )}
                </FeedbackCommentCard>
            )}

            {operations.isDelete && (
                <ConfirmationModal
                    open={operations.isDelete}
                    onCancel={onClose}
                    loading={removeFeedbackReplyLoading}
                    heading={`Delete ${reply?.sticker ? 'sticker' : 'reply'}`}
                    onConfirm={() => handleDelete()}
                    isDeleteConfirmation>
                    <Paragraph
                        text={`Are you sure you want to delete this ${reply?.sticker ? 'sticker' : 'message'}? This cannot be undone.`}
                    />
                </ConfirmationModal>
            )}
            {operations.isEditSticker && (
                <UpdateReplyStickersModal
                    open={operations.isEditSticker}
                    onClose={onClose}
                    schoolId={user?.school?.id}
                    sticker={reply?.sticker}
                    updateFeedBackReplyLoading={updateFeedBackReplyLoading}
                    handleUpdateReply={handleUpdateReply}
                />
            )}
        </div>
    );
};

export default ReplyOperations;
