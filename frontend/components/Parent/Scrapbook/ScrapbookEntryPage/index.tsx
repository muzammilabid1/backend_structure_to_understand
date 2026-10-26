import { gql, useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useState } from 'react';

import { getPupil } from '../../../../graphQl/queries';
import { ADMIN, MAGICPARENT, MINIO_PUBLIC_PATHS, PARENT, TEACHER } from '../../../../shared/Constant';
import { _getBase64ToFile, handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { scrapbookEntryValidation } from '../../../../shared/validations';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonLoading from '../../../Shared/CommonLoading';
import FieldCardOptions from '../../../Shared/FieldCardOptions';
import MathScotWithBubbleText from '../../../Shared/MathScotWithBubbleText';
import PermissionCheckboxes, { PermissionParam } from '../../../Shared/PermissionCheckboxes';
import Heading1 from '../../../Shared/Typography/Heading1';
import Heading3 from '../../../Shared/Typography/Heading3';
import Paragraph from '../../../Shared/Typography/Paragraph';
import Breadcrumb from '../../Breadcrumb';
import { getScrapbookFeedbacksQuery } from '../../Scrapbook';

// Queries
const getPupilTopicForScrapbookEntryPage = gql`
    query getPupilTopic($id: String!) {
        getPupilTopic(id: $id) {
            pupil {
                id
                firstname
                fullname
                school {
                    organisations
                    privacyPolicy
                }
            }
            topic {
                scrapbookPrompt
            }
        }
    }
`;

const getParameterByKeyForScrapbook = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

const getUserForScrapbook = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            sharingAllowed
            type
        }
    }
`;

// Mutations
const saveScrapbookFeedbackMutation = gql`
    mutation saveScrapbookFeedback($input: SaveScrapbookFeedbackInput!, $imageFile: [Upload!], $audioFile: [Upload!]) {
        saveScrapbookFeedback(input: $input, imageFile: $imageFile, audioFile: $audioFile) {
            id
            comment
            logCreatedAt
            photos {
                id
                filename
            }
            audios {
                id
                filename
            }
        }
    }
`;

interface AudioFileValue {
    audioBlob?: Blob;
    audioUrl?: string;
    token?: string;
}

interface PhotoFileValue {
    token: string | null;
    preview?: string;
    filename?: string;
}

const ScrapbookEntryPage = () => {
    const { query, push, isReady } = useRouter();
    const { callSnackbar, token, userId } = useContext(ThemeContext);

    const pupilTopicId = query?.pupiltopic_id as string;

    const [isFieldShow, setIsFieldShow] = useState<string[]>([]);
    const [filename, setFileName] = useState<string | null>(null);
    const [showPhotoPermission, setShowPhotoPermission] = useState(true);
    const [permissionParam, setPermissionParam] = useState<PermissionParam | null>(null);

    const {
        loading: pupilTopicLoading,
        error: pupilTopicError,
        data: pupilTopicData
    } = useQuery(getPupilTopicForScrapbookEntryPage, {
        variables: { id: pupilTopicId },
        skip: !isReady || !pupilTopicId
    });

    const { loading: getPermissionParameterLoading, data: permissionParameter } = useQuery(getParameterByKeyForScrapbook, {
        variables: { key: 'COMMENT_PHOTO_PERMISSIONS' },
        fetchPolicy: 'cache-first'
    });

    const { data: userData } = useQuery(getUserForScrapbook, {
        variables: { id: userId },
        fetchPolicy: 'cache-first',
        skip: !userId
    });

    const pupilTopic = pupilTopicData?.getPupilTopic;

    const [saveScrapbookFeedback, { error: saveError, loading: saveScrapbookFeedbackLoading }] = useMutation(
        saveScrapbookFeedbackMutation,
        {
            refetchQueries: [
                { query: getScrapbookFeedbacksQuery(token?.userTrustLevel >= 2), variables: { pupilId: pupilTopic?.pupil?.id } },
                { query: getUserForScrapbook, variables: { id: userId } },
                { query: getPupil, variables: { id: pupilTopic?.pupil?.id } }
            ],
            awaitRefetchQueries: true
        }
    );

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, pupilTopicError);
    }, [pupilTopicError]);

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, saveError);
    }, [saveError]);

    useEffect(() => {
        if (permissionParameter?.getParameterByKey?.value) {
            try {
                setPermissionParam(JSON.parse(permissionParameter.getParameterByKey.value));
            } catch {
                setPermissionParam(null);
            }
        }
    }, [permissionParameter]);

    useEffect(() => {
        setShowPhotoPermission(userData?.getUser?.sharingAllowed == null);
    }, [userData]);

    const breadcrumbLists = [
        {
            route: [ADMIN, PARENT, MAGICPARENT].includes(token?.userType) ? `/parent/${token?.sub}` : `/child/${pupilTopic?.pupil?.id}`,
            homeIcon: true
        },
        {
            label: pupilTopic?.pupil?.fullname,
            route: `/child/${pupilTopic?.pupil?.id}`
        },
        {
            label: 'Scrapbook'
        }
    ];

    if (!isReady || pupilTopicLoading) return <CommonLoading />;

    const organisations = pupilTopic?.pupil?.school?.organisations;
    const isTeacher = token?.userType === TEACHER;

    return (
        <div className="scrapbook-entry-page" data-test="scrapbook-entry-page">
            <Breadcrumb breadcrumbLists={breadcrumbLists} customClass="hide-on-mobile" />

            <Heading1 customClass="scrapbook-entry-page-main-heading" centerText text={`${pupilTopic?.pupil?.firstname}'s scrapbook`} />
            {pupilTopic?.topic?.scrapbookPrompt && (
                <>
                    <Heading3 customClass="teacher-prompt-heading" text={'Teacher suggestion:'} />
                    <Paragraph
                        customClass="teacher-prompt-subtext"
                        text="This is optional, use this suggestion to guide your entry or share something different! "
                    />
                    <MathScotWithBubbleText
                        image={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Teacher-2.png`}
                        bubbleText={pupilTopic.topic.scrapbookPrompt}
                    />
                </>
            )}

            <Formik
                validationSchema={scrapbookEntryValidation(showPhotoPermission)}
                initialValues={{
                    comment: '',
                    audioFile: '' as AudioFileValue | '',
                    photo: '' as PhotoFileValue | '',
                    thoughts: null as null,
                    shareWithTeacher: userData?.getUser?.sharingAllowed == null ? false : true,
                    sharingAllowed: userData?.getUser?.sharingAllowed === true,
                    rememberPermissions: false
                }}
                enableReinitialize
                onSubmit={async (values) => {
                    const imageFile =
                        typeof values.photo === 'object' && values.photo.preview
                            ? _getBase64ToFile(values.photo.preview, filename ?? 'photo')
                            : undefined;

                    const audioFileUpload =
                        typeof values.audioFile === 'object' && values.audioFile.audioBlob
                            ? new File([values.audioFile.audioBlob], 'audio.webm')
                            : undefined;

                    await saveScrapbookFeedback({
                        variables: {
                            input: {
                                scrapbookPrompt: pupilTopic?.topic?.scrapbookPrompt,
                                pupilId: pupilTopic?.pupil?.id,
                                pupilTopicId,
                                comment: values.comment,
                                sharingAllowed: values.sharingAllowed,
                                sharingAllowedGlobal: token?.userType === ADMIN ? null : values.rememberPermissions
                            },
                            imageFile: imageFile ? [imageFile] : undefined,
                            audioFile: audioFileUpload ? [audioFileUpload] : undefined
                        }
                    });
                    callSnackbar('Moment added to scrapbook', 'success');
                    push(`/child/${pupilTopic?.pupil?.id}/scrapbook`);
                }}>
                {({ values, handleChange, handleSubmit, errors, touched, setFieldValue }) => {
                    return (
                        <Form>
                            <div className="error-message">
                                <Heading3 text="Add your memory " customClass="add-you-memory-heading" />
                                {errors?.thoughts && touched?.thoughts ? <Paragraph>{errors.thoughts as string}</Paragraph> : null}
                            </div>

                            <FieldCardOptions
                                variant="scrapbook"
                                isFieldShow={isFieldShow}
                                setIsFieldShow={setIsFieldShow}
                                values={values}
                                handleChange={handleChange}
                                setFieldValue={setFieldValue}
                                setFileName={setFileName}
                            />

                            {!isTeacher && (
                                <PermissionCheckboxes
                                    permissionParam={permissionParam}
                                    organisations={organisations}
                                    privacyPolicy={pupilTopic?.pupil?.school?.privacyPolicy}
                                    showPhotoPermission={showPhotoPermission}
                                    setShowPhotoPermission={setShowPhotoPermission}
                                    getPermissionParameterLoading={getPermissionParameterLoading}
                                    cardClassName="scrapbook-photo-permission-card"
                                    summaryCardClassName="scrapbook-photo-permission-update-card"
                                />
                            )}

                            <div className="scrapbook-entry-page-buttons-container">
                                <LWPButton
                                    btnText="Cancel"
                                    dataTest="scrapbook-entry-page-cancel-button"
                                    color="inherit"
                                    onClick={() => push(`/child/${pupilTopic?.pupil?.id}/scrapbook`)}
                                    disabled={saveScrapbookFeedbackLoading}
                                />
                                <LWPButton
                                    btnText="Add to scrapbook"
                                    dataTest="scrapbook-entry-page-save-button"
                                    onClick={handleSubmit}
                                    disabled={saveScrapbookFeedbackLoading}
                                />
                            </div>
                        </Form>
                    );
                }}
            </Formik>
        </div>
    );
};

export default ScrapbookEntryPage;
