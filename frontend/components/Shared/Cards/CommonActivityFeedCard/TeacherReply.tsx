/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation } from '@apollo/client';
import SendIcon from '@mui/icons-material/Send';
import { CircularProgress } from '@mui/material';
import { Formik } from 'formik';
import { FeatureTooltipTargets } from 'lwp-shared';
import React, { useContext } from 'react';

import { ThemeContext } from '../../../../shared/Services/handler';
import { teacherCommentValidation } from '../../../../shared/validations';
import InputField from '../../InputField/InputField';

const createFeedbackReply = gql`
    mutation createFeedbackReply($input: CreateFeedbackReplyInput!) {
        createFeedbackReply(input: $input) {
            id
            reply
            logCreatedAt
            logUpdatedAt
            type
            logCreatedBy {
                id
                nameForChildren
            }
        }
    }
`;

interface TeacherReplyProps {
    feedback: Record<string, any>;
    getFirstComment: Record<string, any>;
    setFeeds: (feeds: any) => void;
}

const TeacherReply = ({ setFeeds, feedback, getFirstComment }: TeacherReplyProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [createFeedbackReplyMutation, { loading: createFeedbackReplyLoading }] = useMutation(createFeedbackReply);

    return (
        <Formik
            initialValues={{ comment: '' }}
            validationSchema={teacherCommentValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    const { data } = await createFeedbackReplyMutation({
                        variables: {
                            input: {
                                feedbackId: feedback?.id,
                                reply: values?.comment?.trim()
                            }
                        }
                    });

                    setFeeds((prev) => {
                        const prerItem = structuredClone(prev);

                        const item = prerItem.find((feed) => feed?.id === feedback?.id);

                        if (item) {
                            item.feedbackReplies = [...item.feedbackReplies, data?.createFeedbackReply];
                        }

                        return prerItem;
                    });

                    resetForm();
                } catch (err) {
                    callSnackbar(err, 'error');
                }
            }}>
            {({ values, handleChange, handleSubmit, handleBlur }) => {
                return (
                    <InputField
                        rows={1}
                        id={getFirstComment?.id === feedback?.id ? FeatureTooltipTargets.REPLY_ON_FEEDBACK : `${feedback?.id}-reply`}
                        name="comment"
                        className="feedback_reply_input"
                        label="Reply..."
                        value={values?.comment}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        endIcon={
                            !createFeedbackReplyLoading ? (
                                <SendIcon data-test="teacher-reply-send-button" className="cp" />
                            ) : (
                                <CircularProgress className="reply_loading" />
                            )
                        }
                        endIconHandler={() => !createFeedbackReplyLoading && handleSubmit()}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleSubmit();
                            }
                        }}
                    />
                );
            }}
        </Formik>
    );
};

export default TeacherReply;
