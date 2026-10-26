import { useMutation, useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import gql from 'graphql-tag';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { ADMIN, MINIO_PUBLIC_PATHS, PARENT, TEACHER, unexpectedError } from '../../../shared/Constant';
import { _getBase64ToFile, _removeWhiteSpace, getTopicType, ThemeContext } from '../../../shared/Services/handler';
import { topicActivityValidation } from '../../../shared/validations';
import CommentCard from '../../PagesContent/CommentCard';
import UploadImageCard from '../../Parent/Cards/UploadImageCard';
import DialogWrapper from '../DialogWrapper';
import PermissionCheckboxes from '../PermissionCheckboxes';

// Queries

const getPupilActivityForActivityFeedbackCard = gql`
    query getPupilActivity($id: String!) {
        getPupilActivity(id: $id) {
            id
            rating
            mathscotActivityItemIds
            context
            pupil {
                id
                fullname
                firstname
                lastname
                mathscotUrl {
                    thumbnailImage
                }
                school {
                    curentPeriod {
                        index
                    }
                }
                currentMathscot {
                    character
                    colour
                }
            }
            topic {
                id
                period {
                    index
                }
            }
            feedbacks {
                id
                pupilComment
                parentComment
                userName
                userId
                logCreatedAt
                logCreatedBy {
                    id
                    firstname
                    lastname
                }
                photos {
                    id
                    filename
                }
                sharingAllowed
            }
            activity {
                id
                name
                starValue
                activityType
                welcomeMessage
                topic {
                    id
                    teacherTopicName
                    parentTopicName
                    isReading
                }
                details
                steps {
                    ... on StaticLwpActivityLegacy {
                        legacySteps {
                            id
                            order
                            stepType
                            text
                            imageUrl
                            downloadUrl
                            downloadName
                            linkUrl
                            linkName
                            properties
                            fontType
                            fontSize
                            textCarouselData
                            carouselData {
                                textEditorState
                                labelEditorState
                                type
                                imageUrl
                                alt
                                fileName
                                fileIdentifier
                            }
                            accordionData
                            checkListTextData
                            tableData
                            selectedModalId
                            fileName
                            editorState
                            timerData
                            btnType
                            imageCarouselData
                            checklistImageData
                            includeSeconds
                            clickableAlphabetData
                            dimensions
                            audioUrl
                            tabsData
                            editAsHtml
                        }
                    }
                }
            }
        }
    }
`;

const getParameterByKeyForAddPupilFeedback = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

const getUserForAddPupilFeedback = gql`
    query getUser($id: String!) {
        getUser(id: $id) {
            id
            firstname
            lastname
            email
            phoneNumber
            nameForChildren
            isSchoolLeader
            sharingAllowed
            type
            userStatus
            notificationPreference
            showInterstitial {
                id
                heading
                text
                typeformId
            }
            school {
                id
                curentPeriod {
                    index
                    shortName
                    isCurrentPeriod
                }
            }
        }
    }
`;

// Mutations

const savePupilActivityFeedbackForAddPupilFeedback = gql`
    mutation savePupilActivityFeedback($input: PupilActivityFeedbackInput!, $file: [Upload!]) {
        savePupilActivityFeedback(file: $file, input: $input) {
            id
            pupilComment
            parentComment
            photos {
                id
                filename
            }
        }
    }
`;

const AddPupilFeedback = ({ open, setOpen, updateValues, activity, activityUser, getUserForViewActivity }) => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [customError, setCustomError] = useState('');
    const [showPhotoPermission, setShowPhotoPermission] = useState(true);
    const [permissionParam, setPermissionParam] = useState(null);

    const isAllowed = () => activityUser?.type === PARENT || activityUser?.type === ADMIN;

    const [saveActivityFeedback, { loading: saveFeedbackIsLoading }] = useMutation(savePupilActivityFeedbackForAddPupilFeedback, {
        refetchQueries: [{ query: getUserForAddPupilFeedback, variables: { id: activityUser?.id } }],
        awaitRefetchQueries: true
    });

    const {
        loading: getPermissionParameterLoading,
        error: permissionParamError,
        data: permissionParameter
    } = useQuery(getParameterByKeyForAddPupilFeedback, {
        variables: { key: 'COMMENT_PHOTO_PERMISSIONS' }
    });

    useEffect(() => {
        permissionParamError?.message && callSnackbar(permissionParamError, 'error');
    }, [permissionParamError]);

    useEffect(() => {
        if (permissionParameter?.getParameterByKey?.value) {
            setPermissionParam(JSON.parse(permissionParameter?.getParameterByKey?.value));
        }
    }, [permissionParameter]);

    useEffect(() => {
        if (activityUser?.sharingAllowed == null && updateValues?.sharingAllowed == null) {
            setShowPhotoPermission(true);
        } else {
            setShowPhotoPermission(false);
        }
    }, [activityUser?.sharingAllowed, updateValues?.sharingAllowed]);

    const customErrorSetup = (values) => {
        const { parentComment, pupilComment, photo } = values;

        if (parentComment || pupilComment || photo) {
            setCustomError('');
        }
    };

    return (
        <Formik
            initialValues={{
                parentComment: updateValues?.parentComment ?? '',
                pupilComment: updateValues?.pupilComment ?? '',
                photo: updateValues?.photos?.[0]?.filename ?? '',
                shareWithTeacher: activityUser?.sharingAllowed == null && updateValues?.sharingAllowed == null ? false : true,
                sharingAllowed:
                    updateValues?.sharingAllowed === true || (updateValues?.sharingAllowed == null && activityUser?.sharingAllowed === true)
                        ? true
                        : false,
                rememberPermissions: false
            }}
            enableReinitialize
            validationSchema={topicActivityValidation}
            onSubmit={async (values, { resetForm }) => {
                try {
                    let { parentComment, pupilComment } = values;
                    const files = [];

                    parentComment = _removeWhiteSpace(parentComment);
                    pupilComment = _removeWhiteSpace(pupilComment);

                    if (!parentComment && !pupilComment && !values.photo) return setCustomError('This field is required.');
                    else setCustomError('');

                    const file =
                        values?.photo &&
                        updateValues?.photos?.[0]?.filename !== values?.photo &&
                        _getBase64ToFile(values.photo?.preview, filename);

                    if (file) files.push(file);

                    let saveActivityFeedbackInput = {
                        pupilId: activity?.getPupilActivity?.pupil?.id,
                        pupilActivityId: router?.query?.activity_id,
                        parentComment,
                        pupilComment,
                        hasPhoto: values?.photo ? true : false,
                        id: updateValues?.id ?? null,
                        sharingAllowedGlobal: activityUser?.type === ADMIN ? null : values.rememberPermissions,
                        sharingAllowed: values.sharingAllowed
                    };

                    if (isAllowed()) {
                        await saveActivityFeedback({
                            variables: {
                                file: files,
                                input: saveActivityFeedbackInput
                            },
                            refetchQueries: [
                                { query: getPupilActivityForActivityFeedbackCard, variables: { id: router?.query?.activity_id } },
                                { query: getUserForViewActivity, variables: { id: activityUser?.id } }
                            ],
                            awaitRefetchQueries: true
                        });
                    }

                    resetForm({ values: '' });
                    setOpen();
                    callSnackbar('Comments have been saved', 'success');
                } catch (error) {
                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                        resetForm({ values: '' });
                        setOpen();
                    } else {
                        resetForm({ values: '' });
                        setOpen();
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, errors, touched }) => (
                <DialogWrapper
                    className="add-pupil-feedback-modal"
                    open={open}
                    setOpen={setOpen}
                    onClose={() => setOpen()}
                    cancelBtn
                    dialogFooter
                    primaryBtnText={'Save'}
                    primaryBtnDisabled={activityUser?.type === TEACHER}
                    primaryBtnloading={saveFeedbackIsLoading}
                    primaryBtnHandler={handleSubmit}
                    heading={`${updateValues ? 'Edit' : 'Add'} comments/photos`}>
                    <>
                        <Form>
                            <CommentCard
                                disabled={activityUser?.type === TEACHER}
                                name="parentComment"
                                onChange={(e) => {
                                    handleChange({ target: { name: 'parentComment', value: e.target.value } });
                                    customErrorSetup(values);
                                }}
                                value={values.parentComment}
                                error={errors.parentComment || customError}
                                touched={touched.parentComment || customError}
                                type={getTopicType(activity?.getPupilActivity?.activity?.topic?.isReading)}
                                sideImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/adult-mathscot.png`}
                                textBoxImg={`${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/adult-mathscot.png`}
                                title={'Family'}
                                label={`What did ${activity?.getPupilActivity?.pupil?.firstname} enjoy or do well in this activity?`}
                                dataTest={'edit-parent-comment-card'}
                            />
                            <CommentCard
                                disabled={activityUser?.type === TEACHER}
                                name="pupilComment"
                                onChange={(e) => {
                                    handleChange({ target: { name: 'pupilComment', value: e.target.value } });
                                    customErrorSetup(values);
                                }}
                                value={values.pupilComment}
                                error={errors.pupilComment || customError}
                                touched={touched.pupilComment || customError}
                                type={getTopicType(activity?.getPupilActivity?.activity?.topic?.isReading)}
                                title={
                                    activity?.getPupilActivity?.pupil?.firstname
                                        ? `${activity?.getPupilActivity?.pupil?.firstname}'s`
                                        : 'Pupil'
                                }
                                label="What did you find easy or hard? Let your teacher know!"
                                helperText="I enjoyed beating my sister at this game!"
                                childImage={
                                    activity?.getPupilActivity?.pupil?.mathscotUrl?.thumbnailImage
                                        ? activity?.getPupilActivity?.pupil?.mathscotUrl?.thumbnailImage
                                        : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/base-model.png`
                                }
                                textBoxImg={
                                    activity?.getPupilActivity?.pupil?.mathscotUrl?.thumbnailImage
                                        ? activity?.getPupilActivity?.pupil?.mathscotUrl?.thumbnailImage
                                        : `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/base-model.png`
                                }
                                pupilImage
                                dataTest={'edit-pupil-comment-card'}
                            />
                            {!activity?.getPupilActivity?.activity?.hidePhotoUpload ? (
                                <UploadImageCard
                                    disabled={activityUser?.type === TEACHER}
                                    child_name={activity?.getPupilActivity?.pupil?.firstname}
                                    type={getTopicType(activity?.getPupilActivity?.activity?.topic?.isReading)}
                                    setFileName={setFileName}
                                    previewImage={values.photo?.preview || values?.photo}
                                    error={errors.photo || customError}
                                    touched={touched.photo || customError}
                                    onClose={() => handleChange({ target: { name: 'photo', value: '' } })}
                                    onSave={(croppedImage) => {
                                        handleChange({ target: { name: 'photo', value: croppedImage } });
                                    }}
                                />
                            ) : null}
                            <PermissionCheckboxes
                                permissionParam={permissionParam}
                                organisations={activity?.getPupilActivity?.pupil?.school?.organisations}
                                privacyPolicy={activity?.getPupilActivity?.pupil?.school?.privacyPolicy}
                                showPhotoPermission={showPhotoPermission}
                                setShowPhotoPermission={setShowPhotoPermission}
                                getPermissionParameterLoading={getPermissionParameterLoading}
                                shareWithTeacherClassName="mt8"
                                shareWithTeacherLabelDataTest="pupil-activity-feedback-share-with-teacher-checkbox-label"
                                sharingAllowedWrapperClassName="align-items-center"
                                sharingAllowedClassName="mt8"
                                rememberPermissionsClassName="mb10"
                                divider={<hr className="divider my10" />}
                            />
                        </Form>
                    </>
                </DialogWrapper>
            )}
        </Formik>
    );
};

AddPupilFeedback.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    updateValues: PropTypes.object,
    activityUser: PropTypes.object,
    activity: PropTypes.object,
    getUserForViewActivity: PropTypes.object
};

export default AddPupilFeedback;
