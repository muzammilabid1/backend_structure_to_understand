import { gql, useMutation } from '@apollo/client';
import { Grid, Tooltip } from '@mui/material';
import { Form, Formik } from 'formik';
import { SchoolImpactReportFeedbackContentType } from 'lwp-shared';
import { useContext, useState } from 'react';

import { ThemeContext } from '../../../../shared/Services/handler';
import { updateSchoolImpactReportCommentCardForAdmin } from '../../../../shared/validations';
import { ILwpSchoolImpactReportFeedback } from '../../../../types/entities/ILwpSchoolImpactReportFeedback';
import LWPButton from '../../Button/LWPButton';
import CommonCard from '../../Cards/CommonCard';
import InputField from '../../InputField/InputField';
import ConfirmationModal from '../../Modals/ConfirmationModal';
import Paragraph from '../../Typography/Paragraph';

// Mutation
const updateSchoolImpactReportFeedbackForCommentCard = gql`
    mutation updateSchoolImpactReportFeedback($id: String!, $content: String!) {
        updateSchoolImpactReportFeedback(id: $id, content: $content)
    }
`;

const deleteSchoolImpactReportFeedbackForCommentCard = gql`
    mutation deleteSchoolImpactReportFeedback($id: String!) {
        deleteSchoolImpactReportFeedback(id: $id)
    }
`;

interface CommentCardProps {
    feedback: ILwpSchoolImpactReportFeedback;
    isAdminView?: boolean;
    refetch?: () => void;
}

const CommentCard = ({ feedback, isAdminView = false, refetch }: CommentCardProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [deleteFeedback, setDeleteFeedback] = useState<boolean>(false);
    const [updateSchoolImpactReportFeedbackForCommentCardMutation, { loading }] = useMutation(
        updateSchoolImpactReportFeedbackForCommentCard
    );
    const [deleteSchoolImpactReportFeedbackForCommentCardMutation, { loading: deleteSchoolImpactReportFeedbackForCommentCardLoading }] =
        useMutation(deleteSchoolImpactReportFeedbackForCommentCard);

    return (
        <CommonCard cardContentClassName="content-card">
            {isEditing ? (
                <Formik
                    enableReinitialize
                    initialValues={{
                        content: feedback?.content
                    }}
                    validationSchema={updateSchoolImpactReportCommentCardForAdmin}
                    onSubmit={async (values) => {
                        try {
                            await updateSchoolImpactReportFeedbackForCommentCardMutation({
                                variables: {
                                    id: feedback?.id,
                                    content: values?.content
                                }
                            });
                            refetch();
                            callSnackbar(
                                `${
                                    feedback?.contentType === SchoolImpactReportFeedbackContentType.PARENT_COMMENT
                                        ? 'Parent comment'
                                        : feedback?.contentType === SchoolImpactReportFeedbackContentType.PUPIL_COMMENT
                                          ? 'Pupil comment'
                                          : 'Reading Comment'
                                } updated successfully`,
                                'success'
                            );
                            setIsEditing(false);
                        } catch (error) {
                            callSnackbar(error, 'error');
                            setIsEditing(false);
                        }
                    }}>
                    {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                        return (
                            <Form className="content-card-form" onSubmit={(e) => e.preventDefault()}>
                                <InputField
                                    name="content"
                                    value={values.content}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.content}
                                    touched={touched.content}
                                    label={
                                        feedback?.contentType === SchoolImpactReportFeedbackContentType.PARENT_COMMENT
                                            ? 'Parent comment'
                                            : feedback?.contentType === SchoolImpactReportFeedbackContentType.PUPIL_COMMENT
                                              ? 'Pupil comment'
                                              : 'Reading Comment'
                                    }
                                    type="text"
                                    inputComponent={'textarea'}
                                    rows={6}
                                    multiline
                                    md={12}
                                    lg={12}
                                />
                                <LWPButton
                                    size={'large'}
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={loading}
                                    btnText={'Update'}
                                />
                            </Form>
                        );
                    }}
                </Formik>
            ) : (
                <>
                    {isAdminView ? (
                        <Grid container justifyContent="flex-end" className="action-icons">
                            <Tooltip title={'Edit'}>
                                <span
                                    className={`material-icons cursor-pointer`}
                                    data-test="comment-edit-icon"
                                    onClick={() => setIsEditing(true)}>
                                    edit
                                </span>
                            </Tooltip>
                            <Tooltip title={'Delete'}>
                                <span
                                    className={`material-icons cursor-pointer`}
                                    data-test="comment-delete-icon"
                                    onClick={() => setDeleteFeedback(true)}>
                                    delete
                                </span>
                            </Tooltip>
                        </Grid>
                    ) : null}
                    <Paragraph
                        dataTest={`${feedback?.contentType}-content`}
                        customClass="feedback-content"
                        text={`"${feedback.content}"`}
                    />
                    <Paragraph
                        customClass="feedback-information"
                        text={`${feedback?.contentType === SchoolImpactReportFeedbackContentType.PARENT_COMMENT ? 'Parent of ' : ''}${feedback?.pupilFirstName}, ${feedback?.className} (${feedback?.classYearGroup})`}
                    />
                </>
            )}
            {deleteFeedback && (
                <ConfirmationModal
                    open={deleteFeedback}
                    heading="Delete feedback"
                    onCancel={() => setDeleteFeedback(false)}
                    loading={deleteSchoolImpactReportFeedbackForCommentCardLoading}
                    onConfirm={() => {
                        deleteSchoolImpactReportFeedbackForCommentCardMutation({ variables: { id: feedback?.id } })
                            .then(() => {
                                callSnackbar('Feedback deleted.', 'success');
                                refetch();
                                setDeleteFeedback(false);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setDeleteFeedback(false);
                            });
                    }}>
                    Are you sure you want to delete this feedback from impact report?
                </ConfirmationModal>
            )}
        </CommonCard>
    );
};

export default CommentCard;
