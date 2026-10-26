/* eslint-disable @next/next/no-img-element */
import { gql, useMutation } from '@apollo/client';
import { Grid, Tooltip } from '@mui/material';
import { Form, Formik } from 'formik';
import { useContext, useState } from 'react';

import { getApolloClient } from '../../../../lib/apolloClientConfig';
import { _getBase64ToFile, ThemeContext } from '../../../../shared/Services/handler';
import { ILwpSchoolImpactReportFeedback } from '../../../../types/entities/ILwpSchoolImpactReportFeedback';
import CommonCard from '../../Cards/CommonCard';
import CommonLoading from '../../CommonLoading';
import ImageEditor from '../../ImageEditor';
import ConfirmationModal from '../../Modals/ConfirmationModal';
import Paragraph from '../../Typography/Paragraph';

// Queries

const getFeedbackPhotoLinkForPhotoCard = gql`
    query getFeedbackPhotoLink($feedbackId: String!) {
        getFeedbackPhotoLink(feedbackId: $feedbackId)
    }
`;

// Mutations

const updateSchoolImpactReportFeedbackPhoto = gql`
    mutation updateSchoolImpactReportFeedbackPhoto($file: Upload!, $id: String!) {
        updateSchoolImpactReportFeedbackPhoto(file: $file, id: $id)
    }
`;

const deleteSchoolImpactReportFeedbackForPhotoCard = gql`
    mutation deleteSchoolImpactReportFeedback($id: String!) {
        deleteSchoolImpactReportFeedback(id: $id)
    }
`;

interface PhotoCardProps {
    feedback: ILwpSchoolImpactReportFeedback;
    isAdminView?: boolean;
    refetch?: () => void;
}

const PhotoCard = ({ feedback, isAdminView = false, refetch }: PhotoCardProps) => {
    const { callSnackbar } = useContext(ThemeContext);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [imageUrl, setImageUrl] = useState<string>(null);
    const [deleteFeedback, setDeleteFeedback] = useState<boolean>(false);

    const [updateSchoolImpactReportFeedbackPhotoMutation, { loading: updateSchoolImpactReportFeedbackPhotoLoading }] = useMutation(
        updateSchoolImpactReportFeedbackPhoto
    );

    const [deleteSchoolImpactReportFeedbackForPhotoCardMutation, { loading: deleteSchoolImpactReportFeedbackForPhotoLoading }] =
        useMutation(deleteSchoolImpactReportFeedbackForPhotoCard);

    const urlToBase64Image = async (feedbackId: string): Promise<string | null> => {
        try {
            const client = getApolloClient();

            const { data } = await client.query({
                query: getFeedbackPhotoLinkForPhotoCard,
                variables: { feedbackId },
                fetchPolicy: 'network-only'
            });

            if (!data || !data.getFeedbackPhotoLink) {
                throw new Error('Image URL not found for the given feedback ID');
            }

            const imageUrl = data.getFeedbackPhotoLink;

            // Fetch the image from the URL
            const response: Response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // Convert response to a Blob
            const blob: Blob = await response.blob();

            // Convert Blob to Base64 string
            return new Promise<string>((resolve, reject) => {
                const reader: FileReader = new FileReader();

                reader.onloadend = () => {
                    if (reader.result && typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject('Failed to convert Blob to Base64');
                    }
                };

                reader.onerror = () => reject('Failed to convert Blob to Base64');
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error:', error);
            callSnackbar(error, 'error');

            return null;
        }
    };

    if (loading) return <CommonLoading />;

    return (
        <CommonCard cardContentClassName="content-card">
            {isEditing ? (
                <Formik
                    enableReinitialize
                    initialValues={{
                        content: feedback?.content
                    }}
                    onSubmit={async (values) => {
                        try {
                            const file =
                                values?.content && values?.content?.startsWith('data:')
                                    ? _getBase64ToFile(values?.content, `${feedback?.id}_updated_photo`, false)
                                    : null;

                            if (file) {
                                await updateSchoolImpactReportFeedbackPhotoMutation({
                                    variables: {
                                        id: feedback?.id,
                                        file
                                    }
                                });
                            }

                            callSnackbar(`Photo updated successfully`, 'success');
                            refetch();
                            setIsEditing(false);
                        } catch (error) {
                            callSnackbar(error, 'error');
                            setIsEditing(false);
                        }
                    }}>
                    {({ handleSubmit, setFieldValue }) => {
                        return (
                            <Form className="content-card-form" onSubmit={(e) => e.preventDefault()}>
                                {imageUrl ? (
                                    <ImageEditor
                                        src={imageUrl}
                                        onSave={(croppedImage) =>
                                            setFieldValue('content', croppedImage).then(() => {
                                                handleSubmit();
                                            })
                                        }
                                        loading={updateSchoolImpactReportFeedbackPhotoLoading}
                                        onCancel={() => {
                                            setImageUrl(null);
                                            setFieldValue('content', feedback?.content);
                                            setIsEditing(false);
                                        }}
                                        convertToJpeg={false}
                                    />
                                ) : null}
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
                                    onClick={async () => {
                                        setLoading(true);
                                        const fileUrl = await urlToBase64Image(feedback?.id);

                                        setImageUrl(fileUrl);
                                        setIsEditing(true);
                                        setLoading(false);
                                    }}>
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
                    <img className="feedback-image" src={feedback?.content} alt="feedback-image" />
                    <Paragraph
                        customClass="feedback-information"
                        text={`${feedback?.pupilFirstName}, ${feedback?.className} (${feedback?.classYearGroup})`}
                    />
                </>
            )}
            {deleteFeedback && (
                <ConfirmationModal
                    open={deleteFeedback}
                    heading="Delete feedback"
                    onCancel={() => setDeleteFeedback(false)}
                    loading={deleteSchoolImpactReportFeedbackForPhotoLoading}
                    onConfirm={() => {
                        deleteSchoolImpactReportFeedbackForPhotoCardMutation({ variables: { id: feedback?.id } })
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
                    Are you sure you want to delete this feedback from the impact report?
                </ConfirmationModal>
            )}
        </CommonCard>
    );
};

export default PhotoCard;
