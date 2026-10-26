import { useMutation } from '@apollo/client';
import { useQuery } from '@apollo/client';
import { Form, Formik } from 'formik';
import gql from 'graphql-tag';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { ADMIN, MINIO_PUBLIC_PATHS, PARENT, TEACHER, unexpectedError } from '../../../shared/Constant';
import { _getBase64ToFile, _removeWhiteSpace, getTopicType, ThemeContext } from '../../../shared/Services/handler';
import { topicActivityValidation } from '../../../shared/validations';
import CommentCard from './../../../components/PagesContent/CommentCard';
import UploadImageCard from './../../../components/Parent/Cards/UploadImageCard';
import LWPButton from './../../../components/Shared/Button/LWPButton';
import PermissionCheckboxes from './../../../components/Shared/PermissionCheckboxes';

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

const getParameterByKeyForActivityFeedbackCard = gql`
    query getParameterByKey($key: String!) {
        getParameterByKey(key: $key) {
            key
            value
        }
    }
`;

const getUserForActivityFeedbackCard = gql`
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

const savePupilActivityFeedbackForActivityFeedbackCard = gql`
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

// Component

const ActivityFeedbackCard = ({ activity, activityUser, getUserForViewActivity, isReadyTeddyTopic, routeToTopic }) => {
    const router = useRouter();
    const { callSnackbar } = useContext(ThemeContext);
    const [filename, setFileName] = useState(null);
    const [customError, setCustomError] = useState('');
    const [showPhotoPermission, setShowPhotoPermission] = useState(true);
    const [permissionParam, setPermissionParam] = useState(null);

    const [saveActivityFeedback, { loading: saveFeedbackIsLoading }] = useMutation(savePupilActivityFeedbackForActivityFeedbackCard, {
        refetchQueries: [
            { query: getUserForActivityFeedbackCard, variables: { id: activityUser?.id } },
            { query: getPupilActivityForActivityFeedbackCard, variables: { id: router?.query?.activity_id } }
        ],
        awaitRefetchQueries: true
    });

    const {
        loading: getPermissionParameterLoading,
        error: permissionParamError,
        data: permissionParameter
    } = useQuery(getParameterByKeyForActivityFeedbackCard, {
        variables: { key: 'COMMENT_PHOTO_PERMISSIONS' }
    });

    useEffect(() => {
        if (activityUser?.sharingAllowed == null && activity?.getPupilActivity?.feedbacks?.[0]?.sharingAllowed == null) {
            setShowPhotoPermission(true);
        } else {
            setShowPhotoPermission(false);
        }
    }, [activityUser?.sharingAllowed, activity?.getPupilActivity?.feedbacks?.[0]?.sharingAllowed]);

    useEffect(() => {
        permissionParamError?.message && callSnackbar(permissionParamError, 'error');
    }, [permissionParamError]);

    const isAllowed = () => activityUser?.type === PARENT || activityUser?.type === ADMIN;

    const isChange = (parm1, parm2) => {
        if (!activity?.getPupilActivity?.feedbacks?.length) return true;

        return (
            activity?.getPupilActivity?.feedbacks?.[0]?.parentComment.localeCompare(parm1) === 0 &&
            activity?.getPupilActivity?.feedbacks?.[0]?.pupilComment.localeCompare(parm2) === 0
        );
    };

    useEffect(() => {
        if (permissionParameter?.getParameterByKey?.value) {
            setPermissionParam(JSON.parse(permissionParameter?.getParameterByKey?.value));
        }
    }, [permissionParameter]);

    // prompt the activityUser if they try and leave with unsaved changes
    useEffect(() => {
        const warningText = 'You have unsaved changes - are you sure you wish to leave this page?';

        const handleWindowClose = (e = BeforeUnloadEvent) => {
            const parentComment = document?.getElementsByName('parentComment')?.[0]?.value;
            const pupilComment = document?.getElementsByName('pupilComment')?.[0]?.value;

            if (isChange(parentComment, pupilComment)) return;

            e.preventDefault();

            return (e.returnValue = warningText);
        };

        const handleBrowseAway = () => {
            const parentComment = document?.getElementsByName('parentComment')?.[0]?.value;
            const pupilComment = document?.getElementsByName('pupilComment')?.[0]?.value;

            if (isChange(parentComment, pupilComment)) return;
            if (window.confirm(warningText)) return;

            router?.events.emit('routeChangeError');
            throw 'routeChange aborted.';
        };

        window.addEventListener('beforeunload', handleWindowClose);

        router?.events.on('routeChangeStart', handleBrowseAway);

        return () => {
            window.removeEventListener('beforeunload', handleWindowClose);
            router?.events.off('routeChangeStart', handleBrowseAway);
        };
    }, [router, activity]);

    const customErrorSetup = (values) => {
        const { parentComment, pupilComment, photo } = values;

        if (parentComment || pupilComment || photo) {
            setCustomError('');
        }
    };

    return (
        <Formik
            initialValues={{
                parentComment: '',
                pupilComment: '',
                photo: '',
                shareWithTeacher: activityUser?.sharingAllowed == null ? false : true,
                sharingAllowed: activityUser?.sharingAllowed === true ? true : false,
                rememberPermissions: false
            }}
            enableReinitialize
            validationSchema={topicActivityValidation}
            onSubmit={async (values) => {
                try {
                    let { parentComment, pupilComment } = values;
                    const files = [];

                    parentComment = _removeWhiteSpace(parentComment);
                    pupilComment = _removeWhiteSpace(pupilComment);

                    if (!parentComment && !pupilComment && !values.photo) return setCustomError('This field is required.');
                    else setCustomError('');

                    const file =
                        values?.photo &&
                        activity?.getPupilActivity?.feedbacks?.[0]?.photo !== values?.photo &&
                        _getBase64ToFile(values.photo?.preview, filename);

                    if (file) files.push(file);

                    let saveActivityFeedbackInput = {
                        pupilId: activity?.getPupilActivity?.pupil?.id,
                        pupilActivityId: router?.query?.activity_id,
                        parentComment,
                        pupilComment,
                        hasPhoto: values?.photo ? true : false,
                        id: null,
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
                        callSnackbar('Comments have been saved', 'success');
                        if (isReadyTeddyTopic) routeToTopic();
                    }
                } catch (error) {
                    const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                    if (statusCode) {
                        callSnackbar(error, 'error');
                    } else {
                        window.newrelic?.noticeError(error, { caught: true, handled: false });
                        callSnackbar(unexpectedError, 'error');
                    }
                }
            }}>
            {({ values, handleChange, handleSubmit, errors, touched }) => {
                return (
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
                                dataTest={'parent-comment-card'}
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
                                dataTest={'pupil-comment-card'}
                            />
                            {!activity?.getPupilActivity?.activity?.hidePhotoUpload ? (
                                <UploadImageCard
                                    disabled={activityUser?.type === TEACHER}
                                    child_name={activity?.getPupilActivity?.pupil?.firstname}
                                    type={getTopicType(activity?.getPupilActivity?.activity?.topic?.isReading)}
                                    setFileName={setFileName}
                                    previewImage={values.photo?.preview}
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
                            <div className="save_comment_btn_wrapper">
                                <LWPButton
                                    disabled={activityUser?.type === TEACHER}
                                    btnText="Save comments"
                                    onClick={handleSubmit}
                                    loading={saveFeedbackIsLoading}
                                    dataTest={'save-comments-button'}
                                />
                            </div>
                        </Form>
                    </>
                );
            }}
        </Formik>
    );
};

ActivityFeedbackCard.propTypes = {
    activity: PropTypes.object.isRequired,
    activityUser: PropTypes.object.isRequired,
    getUserForViewActivity: PropTypes.object,
    isReadyTeddyTopic: PropTypes.bool,
    routeToTopic: PropTypes.func
};

export default ActivityFeedbackCard;
