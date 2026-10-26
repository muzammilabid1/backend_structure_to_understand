import { gql, useMutation, useQuery } from '@apollo/client';
import { Autocomplete, CircularProgress, Grid, TextField } from '@mui/material';
import { FieldArray, Form, Formik } from 'formik';
import { useRouter } from 'next/compat/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { getModalsForActivitySteps, getTopicActivitiesForAdmin } from '../../../graphQl/queries';
import sharedJson from '../../../shared/json/index.json';
import {
    _getBase64ToFile,
    generateFileName,
    generateHTMLStringForActivityErrors,
    getActivityComponentName,
    getStepsValue,
    isValid,
    PreSubmitStepWork,
    ThemeContext
} from '../../../shared/Services/handler';
import { addActivityFromAdminValidation } from '../../../shared/validations';
import CommonMultiSelect from '../../Shared/CommonMultiSelect';
import CommonSnackbar from '../../Shared/CommonSnackbar';
import CommonTag from '../../Shared/CommonTag';
import Divider from '../../Shared/Divider';
import Heading3 from '../../Shared/Typography/Heading3';
import LWPButton from './../../../components/Shared/Button/LWPButton';
import CommonCheckBox from './../../../components/Shared/CommonCheckBox';
import CommonFieldArrayForActivitySteps from './../../../components/Shared/CommonFieldArrayForActivitySteps';
import CommonFileUpload from './../../../components/Shared/CommonFileUpload';
import CommonLoading from './../../../components/Shared/CommonLoading';
import RenderHtml from './../../../components/Shared/CommonRenderHtml';
import CommonSelectField from './../../../components/Shared/CommonSelectField';
import InputField from './../../../components/Shared/InputField/InputField';
import ConfirmationModal from './../../../components/Shared/Modals/ConfirmationModal';

const getActivityForAdmin = gql`
    query activity($id: String!) {
        activity(id: $id) {
            id
            name
            cardImage
            welcomeMessage
            rationaleModal {
                id
            }
            activityType
            order
            details
            isHidden
            hidePhotoUpload
            resources
            tags {
                id
                name
                color
            }
            topic {
                id
                hasBeenReleasedInCurrentOrFutureAcademicYear
            }
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
                        fontSize
                        fontType
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
                        setByTeacherData {
                            heading
                            subHeading
                            type
                        }
                        visibilityRules {
                            hideForSchoolTagIds
                        }
                    }
                }
            }
        }
    }
`;

const getTagsForAdmin = gql`
    query getTagsForAdmin {
        getTagsForAdmin {
            id
            color
            name
        }
    }
`;

const getAllTopicsForDetails = gql`
    query allTopics($filter: TopicFilter) {
        allTopics(filter: $filter) {
            id
            teacherTopicName
            yearGroups {
                shortName
            }
            domains {
                title
            }
        }
    }
`;

const updateActivity = gql`
    mutation updateActivity($file: [Upload!], $input: UpdateActivityInput!) {
        updateActivity(file: $file, input: $input) {
            id
        }
    }
`;

const deleteActivity = gql`
    mutation deleteActivity($id: String!) {
        deleteActivity(id: $id) {
            status
            msg
        }
    }
`;

const duplicateActivity = gql`
    mutation duplicateActivity($activityId: String!, $topicId: String!, $order: Float!) {
        duplicateActivity(activityId: $activityId, topicId: $topicId, order: $order)
    }
`;

const Details = ({ activity_id, setActivityName, setTopicId }) => {
    const router = useRouter();
    const [filename, setFileName] = useState(null);
    const [errorInfo, setErrorInfo] = useState(null);
    const [openDeleteItemConfirmationModal, setOpenDeleteItemConfirmationModal] = useState(false);
    const { callSnackbar } = useContext(ThemeContext);

    const { loading, error: error, data: activity } = useQuery(getActivityForAdmin, { variables: { id: activity_id } });

    const [updateActivityMutation, { loading: updateActivityLoading }] = useMutation(updateActivity, {
        refetchQueries: [{ query: getActivityForAdmin, variables: { id: activity_id } }],
        awaitRefetchQueries: true
    });

    const [deleteActivityMutation, { loading: deleteActivityLoading }] = useMutation(deleteActivity);
    const [duplicateActivityMutation, { loading: duplicateActivityLoading, error: duplicateActivityError }] =
        useMutation(duplicateActivity);

    const { loading: getAllTagFormIsLoading, data: allTagFormData } = useQuery(getTagsForAdmin);
    const { loading: topicsLoading, data: topicsData } = useQuery(getAllTopicsForDetails);
    const { data: modalsData, loading: modalsLoading } = useQuery(getModalsForActivitySteps);

    useEffect(() => {
        if (activity) {
            setActivityName(activity?.activity?.name);
            setTopicId(activity?.activity?.topic?.id);
        }
    }, [activity]);

    useEffect(() => {
        error?.message && callSnackbar(error, 'error');
        duplicateActivityError?.message && callSnackbar(duplicateActivityError, 'error');
    }, [error, duplicateActivityError]);

    if (loading || topicsLoading || updateActivityLoading) return <CommonLoading />;

    const legacySteps = activity?.activity?.steps?.legacySteps ?? [];
    const isStepEditingLocked =
        activity?.activity?.topic?.hasBeenReleasedInCurrentOrFutureAcademicYear === true &&
        legacySteps.some((s) => s.stepType === 'SET_BY_TEACHER');

    return (
        <div className="activity_detailpage">
            <Formik
                initialValues={{
                    name: activity?.activity?.name,
                    cardImage: activity?.activity?.cardImage,
                    welcomeMessage: activity?.activity?.welcomeMessage,
                    rationaleModalId: activity?.activity?.rationaleModal?.id ?? null,
                    activityType: activity?.activity?.activityType,
                    order: activity?.activity?.order,
                    details: getActivityComponentName(activity?.activity?.details) ?? '',
                    isHidden: activity?.activity?.isHidden,
                    hidePhotoUpload: activity?.activity?.hidePhotoUpload,
                    resources: activity?.activity?.resources?.length ? JSON.parse(activity?.activity?.resources) : [''],
                    steps: getStepsValue(activity?.activity?.steps?.legacySteps ?? []),
                    addStepType: sharedJson?.activity_step_types[0].key,
                    tags: activity?.activity?.tags?.map((tag) => ({ id: tag?.id, value: tag?.name, ...tag })),
                    topicForActivityCopy: null,
                    newOrder: null
                }}
                validationSchema={addActivityFromAdminValidation}
                // enableReinitialize
                validateOnChange={false}
                onSubmit={async (values) => {
                    try {
                        let {
                            name,
                            resources,
                            isHidden,
                            order,
                            welcomeMessage,
                            rationaleModalId,
                            activityType,
                            details,
                            cardImage,
                            hidePhotoUpload,
                            steps,
                            tags
                        } = values;

                        let files = [];

                        let activityResource = resources.map((resource) => resource?.trim()).filter((x) => x?.trim());

                        [steps, files] = PreSubmitStepWork(steps, files, true);

                        const errorMessages = isValid(steps);

                        if (errorMessages?.length > 0) {
                            setErrorInfo({ open: true, message: <RenderHtml text={generateHTMLStringForActivityErrors(errorMessages)} /> });
                        } else {
                            let file = cardImage && filename && _getBase64ToFile(cardImage, generateFileName(filename));

                            if (file) files.push(file);

                            await updateActivityMutation({
                                variables: {
                                    file: files,
                                    input: {
                                        id: activity_id,
                                        name,
                                        resources: JSON.stringify(activityResource),
                                        isHidden,
                                        order: +order,
                                        welcomeMessage,
                                        rationaleModalId: rationaleModalId ?? null,
                                        activityType,
                                        details: details ? JSON.stringify({ activityComponentName: details }) : '',
                                        hasCardImage: cardImage ? true : false,
                                        hidePhotoUpload,
                                        steps,
                                        tags: tags.map((tag) => tag.id)
                                    }
                                }
                            });
                            callSnackbar('Changes saved', 'success');
                        }
                    } catch (error) {
                        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

                        if (statusCode) {
                            callSnackbar(error, 'error');
                        } else {
                            window.newrelic?.noticeError(error, { caught: true, handled: false });
                            callSnackbar(
                                {
                                    message: error?.message,
                                    networkError: { statusCode: 535 }
                                },
                                'error'
                            );
                        }
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched, setFieldValue, setFieldTouched }) => {
                    return (
                        <Form>
                            <InputField
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.name}
                                touched={touched.name}
                                label="Activity name"
                                type="text"
                                md={4}
                                lg={4}
                            />
                            <InputField
                                name="welcomeMessage"
                                value={values.welcomeMessage}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.welcomeMessage}
                                touched={touched.welcomeMessage}
                                label="Welcome message"
                                type="text"
                                md={4}
                                lg={4}
                            />
                            <CommonSelectField
                                md={4}
                                lg={4}
                                displayEmpty
                                shrink
                                disabled
                                value={values.activityType}
                                label="Activity type"
                                options={sharedJson.activity_types}
                                onChange={(e) => {
                                    handleChange({
                                        target: { name: 'activityType', value: e.target.value }
                                    });
                                }}
                                onBlur={(e) =>
                                    handleBlur({
                                        target: { name: 'activityType', value: e.target.value }
                                    })
                                }
                            />
                            {values.activityType === 'LEGACY' && (
                                <Grid item xs={12} md={4} lg={4} classes={{ root: 'root' }} className="rationale-modal-picker">
                                    <Autocomplete
                                        id="rationale-modal-option"
                                        data-test="rationale-modal-picker"
                                        loading={modalsLoading}
                                        disabled={modalsLoading}
                                        options={modalsData?.getModals || []}
                                        value={(modalsData?.getModals || []).find((modal) => modal?.id === values.rationaleModalId) ?? null}
                                        onChange={(_, value) => setFieldValue('rationaleModalId', value?.id ?? null)}
                                        getOptionLabel={(option) => option?.nameForContentDev ?? option?.name ?? ''}
                                        isOptionEqualToValue={(option, value) => option?.id === value?.id}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Rationale modal"
                                                variant="outlined"
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {modalsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    )
                                                }}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}
                            <InputField
                                name="order"
                                value={values.order}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.order}
                                touched={touched.order}
                                label="Activity order"
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                md={4}
                                lg={4}
                            />

                            <CommonMultiSelect
                                name="tags"
                                label="Tags"
                                value={values.tags}
                                displayEmpty
                                shrink={values.tags}
                                loading={getAllTagFormIsLoading}
                                options={(allTagFormData?.getTagsForAdmin || []).map((item) => ({
                                    value: item.name,
                                    id: item.id,
                                    ...item
                                }))}
                                onChange={(value) =>
                                    handleChange({
                                        target: { name: 'tags', value: value }
                                    })
                                }
                                onBlur={(value) =>
                                    handleBlur({
                                        target: { name: 'tags', value: value }
                                    })
                                }
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <CommonTag name={option?.value} bgColor={option?.color} {...getTagProps({ index })} />
                                    ))
                                }
                            />
                            {values.activityType !== 'LEGACY' && (
                                <InputField
                                    name="details"
                                    value={values.details}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.details}
                                    touched={touched.details}
                                    label="Activity component name"
                                    md={4}
                                    lg={4}
                                />
                            )}
                            <CommonCheckBox
                                name="isHidden"
                                checked={values.isHidden}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Hide Activity"
                                error={errors.isHidden}
                                dataTest="hide-activity-checkbox"
                            />
                            <CommonCheckBox
                                name="hidePhotoUpload"
                                checked={values.hidePhotoUpload}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                label="Hide Photo Upload"
                                error={errors.hidePhotoUpload}
                            />

                            <div className="activity_resource">
                                <Divider />
                                <br />
                                <Heading3 text={'resources'} />
                                <br />
                                <FieldArray
                                    name="resources"
                                    render={(arrayHelpers) => {
                                        return (
                                            <div>
                                                {values?.resources?.map((resource, index) => {
                                                    return (
                                                        <div key={index} className="activity_resource_form">
                                                            <InputField
                                                                name={index + 1}
                                                                value={resource}
                                                                onChange={(e) => {
                                                                    const updatedArray = values?.resources?.map((x, i) => {
                                                                        if (i === index) {
                                                                            return e.target.value;
                                                                        } else {
                                                                            return x;
                                                                        }
                                                                    });

                                                                    setFieldValue('resources', updatedArray);
                                                                }}
                                                                onBlur={handleBlur}
                                                                label={`Resource ${index + 1}`}
                                                                md={4}
                                                                lg={4}
                                                            />
                                                            <div className="add_activity_resource_button">
                                                                <LWPButton
                                                                    customClass="carousel-step-add-btn"
                                                                    btnText="+"
                                                                    onClick={() => {
                                                                        arrayHelpers.insert(index + 1, '');
                                                                    }}
                                                                />
                                                                <LWPButton
                                                                    customClass="carousel-step-remove-btn"
                                                                    btnText="-"
                                                                    disabled={values?.resources?.length === 1}
                                                                    onClick={() => {
                                                                        if (values?.resources?.length === 1) {
                                                                            handleChange({
                                                                                target: { name: 'resources', value: null }
                                                                            });
                                                                        } else {
                                                                            arrayHelpers.remove(index);
                                                                        }
                                                                    }}
                                                                    // onClick={() => arrayHelpers.remove(index)}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }}
                                />
                                <Divider customClass="mb5" />
                            </div>

                            <div className="copy-activity-container">
                                <Heading3 text={'Copy this activity'} />
                                <Autocomplete
                                    id="copy-activity-options"
                                    options={(topicsData?.allTopics || []).map((topic) => ({
                                        key: topic?.id,
                                        name: `${topic?.teacherTopicName}, (${topic?.yearGroups
                                            ?.map((y) => y?.shortName)
                                            .join(', ')}), ${topic?.domains?.map((d) => d?.title).join(', ')}`
                                    }))}
                                    onChange={(_, value) => {
                                        handleChange({
                                            target: {
                                                name: 'topicForActivityCopy',
                                                value: value?.key
                                            }
                                        });
                                    }}
                                    value={(topicsData?.allTopics || []).find((topic) => topic?.id === values?.topicForActivityCopy)}
                                    getOptionLabel={(option) => {
                                        return option?.name;
                                    }}
                                    style={{ marginBottom: '10px', width: '100%' }}
                                    renderInput={(params) => <TextField {...params} label="Topics" variant="outlined" />}
                                />
                                <InputField
                                    name="newOrder"
                                    value={values.newOrder}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.newOrder}
                                    touched={touched.newOrder}
                                    label="Order for copied activity"
                                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                    md={4}
                                    lg={4}
                                />
                                <LWPButton
                                    btnText="Copy activity"
                                    disabled={!values.topicForActivityCopy || !values.newOrder || isNaN(values.newOrder)}
                                    onClick={() => {
                                        duplicateActivityMutation({
                                            variables: {
                                                activityId: activity_id,
                                                topicId: values?.topicForActivityCopy,
                                                order: +values?.newOrder
                                            }
                                        })
                                            .then(() => {
                                                callSnackbar('Activity copied successfully!', 'success');
                                                setFieldValue('topicForActivityCopy', null);
                                                setFieldValue('newOrder', null);
                                            })
                                            .catch(({ ...err }) => {
                                                callSnackbar(err, 'error', 'Could not copy activity');
                                            });
                                    }}
                                    loading={duplicateActivityLoading}
                                />
                                <Divider customClass="mb5" />
                            </div>

                            {values.activityType == 'LEGACY' && (
                                <CommonFieldArrayForActivitySteps
                                    values={values}
                                    handleChange={handleChange}
                                    handleBlur={handleBlur}
                                    setFieldTouched={setFieldTouched}
                                    setFieldValue={setFieldValue}
                                    errors={errors}
                                    touched={touched}
                                    loading={updateActivityLoading}
                                    isStepEditingLocked={isStepEditingLocked}
                                    showVisibilityRules
                                />
                            )}

                            <Grid container className="thumbnail_image_container">
                                <Grid item xs={12} md={4} lg={4}>
                                    <CommonFileUpload
                                        name="cardImage"
                                        previewImage={values.cardImage}
                                        icon="folder"
                                        heading="File"
                                        setFileName={setFileName}
                                        onClose={() => handleChange({ target: { name: 'cardImage', value: '' } })}
                                        onSave={(croppedImage) => {
                                            handleChange({ target: { name: 'cardImage', value: croppedImage } });
                                        }}
                                    />
                                </Grid>
                            </Grid>

                            <br />
                            <LWPButton btnText="Update details" onClick={handleSubmit} loading={updateActivityLoading} />
                            <br />
                            <br />
                            <LWPButton
                                customClass="remove-activity-btn"
                                btnText="Delete activity"
                                onClick={() => setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal)}
                            />
                        </Form>
                    );
                }}
            </Formik>
            {openDeleteItemConfirmationModal && (
                <ConfirmationModal
                    open={openDeleteItemConfirmationModal}
                    onCancel={() => setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal)}
                    onConfirm={() => {
                        deleteActivityMutation({
                            variables: { id: activity_id },
                            refetchQueries: [{ query: getTopicActivitiesForAdmin, variables: { id: activity?.activity?.topic?.id } }],
                            awaitRefetchQueries: true
                        })
                            .then(() => {
                                callSnackbar('Activity deleted successfully!', 'success');
                                setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal);
                                router?.push(`/admin/topic/${activity?.activity?.topic?.id}`);
                            })
                            .catch(({ ...err }) => {
                                callSnackbar(err, 'error');
                                setOpenDeleteItemConfirmationModal(!openDeleteItemConfirmationModal);
                            });
                    }}
                    loading={deleteActivityLoading}
                    heading="Delete Activity">
                    Are you sure you want to delete this activity?
                </ConfirmationModal>
            )}
            {errorInfo?.open && (
                <CommonSnackbar message={errorInfo?.message} type={'error'} open={errorInfo?.open} onClose={() => setErrorInfo(null)} />
            )}
        </div>
    );
};

Details.propTypes = { activity_id: PropTypes.string, setActivityName: PropTypes.func, setTopicId: PropTypes.func };

export default Details;
