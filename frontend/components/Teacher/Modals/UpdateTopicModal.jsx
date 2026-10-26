import { gql, useMutation, useQuery } from '@apollo/client';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import { Alert, Grid } from '@mui/material';
import { Formik } from 'formik';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';

import { addClassTopic, deleteClassTopic, updateClassTopic } from '../../../graphQl/mutations';
import { getClassTopicForWeekByWeek, getClassTopics, getSchoolClass, getSchoolClassforSelectTopic } from '../../../graphQl/queries';
import { getCookie, getJwtDecoded } from '../../../lib/manageCookies';
import { ACCESS_TOKEN_COOKIE, unexpectedError } from '../../../shared/Constant';
import formInitialStates from '../../../shared/formInitialStates';
import {
    _get_iso_8601_date_format,
    _removeWhiteSpace,
    buildSetByTeacherFormData,
    getYearGroups,
    handleErrorSnackbar,
    showDate,
    ThemeContext,
    validateSetByTeacherSteps
} from '../../../shared/Services/handler';
import { addTopicValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonLoading from './../../Shared/CommonLoading';
import CommonTooltipIcon from './../../Shared/CommonTooltipIcon';
import DialogWrapper from './../../Shared/DialogWrapper';
import DateField from './../../Shared/InputField/DateField';
import InputField from './../../Shared/InputField/InputField';
import ConfirmationModal from './../../Shared/Modals/ConfirmationModal';
import Paragraph from './../../Shared/Typography/Paragraph';

import ScrapbookPromptPreviewForTopicSchedule from '../../Shared/ScrapbookPromptPreviewForTopicSchedule';
import SetByTeacherAccordion, { getSetByTeacherStepsForTopicQuery } from './SetByTeacherAccordion.tsx';

const anyPupilInClassHasTopicQueryForUpdateTopicModal = gql`
    query anyPupilInClassHasTopic($classId: String!, $staticTopicId: String!) {
        anyPupilInClassHasTopic(classId: $classId, staticTopicId: $staticTopicId)
    }
`;

const UpdateTopicModal = ({
    open,
    setOpen,
    topicData,
    primaryText,
    secondaryText,
    isReleasedClick = false,
    isPreview = false,
    isLoading = false,
    showSetByTeacherDetails = false,
    showScrapbookPrompt = false
}) => {
    const router = useRouter();

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [warningModalOpen, setWarningModalOpen] = useState(false);

    const queryParams = useParams();
    const { callSnackbar } = useContext(ThemeContext);

    const classId = queryParams?.class_id;

    const staticTopicId = topicData?.__typename === 'StaticLwpTopic' ? topicData?.id : topicData?.topic?.id;
    const classTopicId = topicData?.__typename === 'StaticLwpTopic' ? null : topicData?.id;
    const isUpdatingTopic = topicData?.releaseDate && primaryText !== 'Add topic';
    const hasSetByTeacherSteps =
        topicData?.__typename === 'StaticLwpTopic' ? topicData?.hasSetByTeacherSteps : topicData?.topic?.hasSetByTeacherSteps;

    const { loading, data: classData } = useQuery(getSchoolClassforSelectTopic, {
        variables: { id: classId },
        skip: !open
    });

    const {
        data: anyPupilHasTopicData,
        loading: loadingAnyPupilHasTopic,
        error: anyPupilHasTopicError
    } = useQuery(anyPupilInClassHasTopicQueryForUpdateTopicModal, {
        variables: { classId, staticTopicId },
        skip: !open || !classId || !staticTopicId || isUpdatingTopic,
        fetchPolicy: 'network-only'
    });

    const anyPupilHasTopic = anyPupilHasTopicData?.anyPupilInClassHasTopic;

    const {
        data: sbtStepsData,
        loading: sbtStepsQueryLoading,
        error: sbtStepsError
    } = useQuery(getSetByTeacherStepsForTopicQuery, {
        variables: {
            topicId: staticTopicId,
            classTopicId: isUpdatingTopic ? topicData?.id : null,
            isReleased: !!(isUpdatingTopic && topicData?.released)
        },
        skip: !showSetByTeacherDetails || !hasSetByTeacherSteps || !staticTopicId || !open,
        fetchPolicy: 'cache-first'
    });

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, anyPupilHasTopicError);
        handleErrorSnackbar(callSnackbar, sbtStepsError);
    }, [anyPupilHasTopicError, sbtStepsError]);

    const setByTeacherRefetch =
        showSetByTeacherDetails && isUpdatingTopic && staticTopicId && topicData?.id
            ? [
                  {
                      query: getSetByTeacherStepsForTopicQuery,
                      variables: {
                          topicId: staticTopicId,
                          classTopicId: topicData?.id,
                          // !! required — isUpdatingTopic can be undefined/null (not false), which Apollo would drop entirely, breaking the required Boolean! argument
                          isReleased: !!(isUpdatingTopic && topicData?.released)
                      }
                  }
              ]
            : [];

    const [addTopic, { loading: addClassTopicLoading }] = useMutation(addClassTopic, {
        awaitRefetchQueries: true,
        refetchQueries: [
            { query: getClassTopics, variables: { classId: queryParams?.class_id } },
            { query: getSchoolClass, variables: { id: queryParams?.class_id } },
            ...setByTeacherRefetch
        ]
    });

    const [updateTopic, { loading: updateClassTopicLoading }] = useMutation(updateClassTopic, {
        refetchQueries: [
            { query: getClassTopics, variables: { classId: queryParams?.class_id } },
            { query: getClassTopicForWeekByWeek, variables: { classId, topicId: router?.query?.topicId } },
            ...setByTeacherRefetch
        ],
        awaitRefetchQueries: true
    });

    const [deleteTopic, { loading: deleteClassTopicLoading }] = useMutation(deleteClassTopic);

    const buildSetByTeacherData = (values) => {
        if (!showSetByTeacherDetails) {
            return { setByTeacherStepIds: undefined, setByTeacherStepMessages: undefined, file: undefined };
        }

        return buildSetByTeacherFormData(values);
    };

    /*
     * An error with a status carries a message written for people; anything else is unexpected, and its own
     * message can be raw or empty (a storage outage arrives with none), so it gets the generic one instead.
     * Shared by every save in this modal, including the ones behind the confirmation prompts.
     */
    const showSaveError = (error) => {
        const statusCode = error?.graphQLErrors?.[0]?.extensions?.exception?.status || error?.networkError?.statusCode;

        if (statusCode) {
            callSnackbar(error, 'error');
        } else {
            window.newrelic?.noticeError(error, { caught: true, handled: false });
            callSnackbar(unexpectedError, 'error');
        }
    };

    const handleDeleteTopic = async () => {
        try {
            await deleteTopic({
                variables: { id: topicData?.id },
                refetchQueries: [{ query: getClassTopics, variables: { classId } }],
                awaitRefetchQueries: true
            });
            setOpen();
            callSnackbar('Remove topic successfully!', 'success');
        } catch (error) {
            handleErrorSnackbar(callSnackbar, error);
        }
    };

    const updateTopicHandler = async ({ values, resetForm }) => {
        try {
            if (
                classData?.schoolClass?.isRegistrationClass &&
                classData?.schoolClass?.pupils?.length > 0 &&
                classData?.schoolClass?.pupils?.every((p) =>
                    p?.classes?.some(
                        (schoolClass) =>
                            !schoolClass?.isRegistrationClass &&
                            schoolClass?.period?.index === classData?.schoolClass?.school?.curentPeriod?.index
                    )
                )
            ) {
                setWarningModalOpen(!warningModalOpen);
                return;
            }

            let { startDate, endDate, topicMessage } = values;

            topicMessage = _removeWhiteSpace(topicMessage);

            const token = getCookie(ACCESS_TOKEN_COOKIE);
            const decodedToken = getJwtDecoded(token);

            const inputs = {
                releaseDate: _get_iso_8601_date_format(startDate),
                dueDate: endDate ? _get_iso_8601_date_format(endDate) : null,
                teacherMessage: topicMessage
            };

            const { setByTeacherStepIds, setByTeacherStepMessages, file } = buildSetByTeacherData(values);

            if (isUpdatingTopic) {
                await updateTopic({
                    variables: {
                        input: { id: topicData?.id, ...inputs, setByTeacherStepIds, setByTeacherStepMessages },
                        file
                    }
                });
                setOpen();
                resetForm({ values: '' });
                callSnackbar('Changes saved', 'success');
            } else {
                await addTopic({
                    variables: {
                        input: {
                            ...inputs,
                            createdBy: decodedToken.sub,
                            topicId: topicData?.id,
                            classId,
                            setByTeacherStepIds,
                            setByTeacherStepMessages
                        },
                        file
                    }
                });
                setOpen();
                resetForm({ values: '' });
                callSnackbar('New topic created', 'success');
            }
        } catch (error) {
            showSaveError(error);
        }
    };

    if (loading || isLoading || loadingAnyPupilHasTopic) return <CommonLoading />;

    return (
        <Formik
            initialValues={
                !topicData?.releaseDate || isReleasedClick
                    ? {
                          ...formInitialStates['addTopic'],
                          setByTeacherStepIds: {},
                          setByTeacherSteps: [],
                          setByTeacherStepMessages: {}
                      }
                    : {
                          startDate: topicData?.releaseDate ? new Date(topicData?.releaseDate) : null,
                          endDate: topicData?.dueDate ? new Date(topicData?.dueDate) : null,
                          topicMessage: topicData?.teacherMessage,
                          skipGroupPupils: topicData?.skipGroupPupils,
                          isUpdate: isUpdatingTopic ? true : false,
                          setByTeacherStepIds: {},
                          setByTeacherSteps: [],
                          setByTeacherStepMessages: {}
                      }
            }
            validate={(values) => validateSetByTeacherSteps(values, showSetByTeacherDetails && hasSetByTeacherSteps)}
            validationSchema={addTopicValidation}
            enableReinitialize
            onSubmit={async (values, { resetForm, validateForm }) => {
                if ((isReleasedClick || anyPupilHasTopic) && !isUpdatingTopic) {
                    const errors = await validateForm();
                    if (Object.keys(errors).length > 0) return;
                    setConfirmModalOpen(!confirmModalOpen);
                } else {
                    updateTopicHandler({ values, resetForm });
                }
            }}>
            {({ values, handleChange, handleBlur, handleSubmit, errors, touched, resetForm }) => {
                const sbtStepsLoading = showSetByTeacherDetails && hasSetByTeacherSteps && sbtStepsQueryLoading;

                return (
                    <>
                        <DialogWrapper
                            open={open}
                            setOpen={() => {
                                setOpen();
                            }}
                            heading={topicData?.teacherTopicName || topicData?.topic?.teacherTopicName}
                            className="update-topic-modal"
                            primaryBtnText={primaryText}
                            primaryBtnHandler={handleSubmit}
                            contentWidth="618px"
                            primaryBtnDisabled={sbtStepsLoading}
                            primaryBtnloading={addClassTopicLoading || updateClassTopicLoading}
                            secondaryBtn={secondaryText}
                            secondaryBtnloading={deleteClassTopicLoading}
                            secondaryBtnHandler={handleDeleteTopic}
                            cancelBtn
                            dialogFooter
                            subHeading={
                                <Paragraph
                                    text={`${getYearGroups(topicData?.yearGroups || topicData?.topic?.yearGroups)} . ${
                                        topicData?.domains?.length > 0
                                            ? topicData?.domains?.map((domain) => domain?.subject?.name).join(', ')
                                            : topicData?.topic?.domains?.map((domain) => domain?.subject?.name).join(', ')
                                    }`}
                                />
                            }>
                            {!isPreview ? (
                                <div className="topic-preview-and-resources">
                                    <LWPButton
                                        btnText="Preview topic"
                                        startIcon="visibility"
                                        color="inherit"
                                        variant="text"
                                        size="medium"
                                        onClick={() => {
                                            const path = `/previewtopic/${staticTopicId}${classTopicId && hasSetByTeacherSteps ? `?classTopicId=${classTopicId}` : ''}`;

                                            window.open(
                                                `${location.protocol}//${location.host}${path}`,
                                                '_blank',
                                                `width=${window.innerWidth}, height=${window.innerHeight}`
                                            );
                                        }}
                                    />
                                    {(topicData?.topic?.teacherPdf || topicData?.teacherPdf) && (
                                        <LWPButton
                                            btnText="Resources (PDF)"
                                            startIcon="download"
                                            color="inherit"
                                            variant="text"
                                            size="medium"
                                            onClick={() => {
                                                window.location.href = topicData?.topic?.teacherPdf || topicData?.teacherPdf;
                                            }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <br />
                            )}

                            {topicData?.topic?.isTeacherPdfRequired ? (
                                <>
                                    <Alert icon={<HelpOutlineOutlinedIcon />} color="warning">
                                        <Paragraph
                                            text={
                                                'Handouts are required to complete these activities - please print out the resources (PDF) and hand them out to the pupils when the topic is released'
                                            }
                                        />
                                    </Alert>

                                    <br />
                                </>
                            ) : (
                                ''
                            )}

                            <Paragraph
                                text={topicData?.topic?.teacherDescription || topicData?.teacherDescription}
                                customClass="topic-review-text"
                            />

                            <Grid container spacing={3}>
                                {showScrapbookPrompt && (topicData?.topic?.scrapbookPrompt || topicData?.scrapbookPrompt) ? (
                                    <Grid item xs={12}>
                                        <ScrapbookPromptPreviewForTopicSchedule
                                            scrapbookPrompt={topicData?.topic?.scrapbookPrompt || topicData?.scrapbookPrompt}
                                        />
                                    </Grid>
                                ) : null}

                                <DateField
                                    name="startDate"
                                    label="Start date"
                                    md={'6'}
                                    lg={'6'}
                                    value={values.startDate}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.startDate}
                                    touched={touched.startDate}
                                    minDate={new Date()}
                                    disabled={isPreview ? true : isReleasedClick ? false : topicData?.released}
                                    iconPosition="end"
                                    endCommonTooltipIcon={
                                        <CommonTooltipIcon
                                            text="The topic will be available to parents when they log in at any time on this day. Once it is available to parents the settings here can no longer be edited. They will receive an email notification to complete the topic after school (on a school day) or in the morning (on other days)."
                                            customIconClass="skip-toolTip"
                                        />
                                    }
                                />

                                <DateField
                                    name="endDate"
                                    label="End date (optional)"
                                    value={values.endDate}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.endDate}
                                    touched={touched.endDate}
                                    minDate={values.startDate}
                                    md={'6'}
                                    lg={'6'}
                                    disabled={isPreview}
                                    iconPosition="end"
                                    endCommonTooltipIcon={
                                        <CommonTooltipIcon
                                            text="This is displayed to parents as an indication of when they should complete this topic by. (It will still be available for them to access after this date.)"
                                            customIconClass="skip-toolTip"
                                        />
                                    }
                                />
                            </Grid>

                            <div className="topic-message-input">
                                <InputField
                                    name="topicMessage"
                                    label="Topic message (optional)"
                                    wordCount={values?.topicMessage?.length || 0}
                                    inputProps={{
                                        maxlength: 150
                                    }}
                                    value={values.topicMessage}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={errors.topicMessage}
                                    touched={touched.topicMessage}
                                    md={12}
                                    lg={12}
                                    type="text"
                                    multiline
                                    rows={3}
                                    disabled={isPreview ? true : isReleasedClick ? false : topicData?.released}
                                />

                                {!isPreview ? (
                                    <Paragraph text="This note will appear at the top of the topic page for parents & children, before the video." />
                                ) : null}
                            </div>

                            {showSetByTeacherDetails && hasSetByTeacherSteps && (
                                <SetByTeacherAccordion
                                    steps={sbtStepsData?.getSetByTeacherStepsForTopic ?? []}
                                    loading={sbtStepsQueryLoading}
                                    isReleased={isUpdatingTopic && !!topicData?.released}
                                />
                            )}
                        </DialogWrapper>

                        {confirmModalOpen && (
                            <ConfirmationModal
                                open={confirmModalOpen}
                                heading="Are you sure?"
                                btnText="Confirm"
                                primaryBtnDisabled={addClassTopicLoading}
                                loading={addClassTopicLoading}
                                onCancel={() => setConfirmModalOpen(!confirmModalOpen)}
                                onConfirm={() => {
                                    const token = getCookie(ACCESS_TOKEN_COOKIE);
                                    const decodedToken = getJwtDecoded(token);
                                    const { setByTeacherStepIds, setByTeacherStepMessages, file } = buildSetByTeacherData(values);

                                    addTopic({
                                        variables: {
                                            input: {
                                                releaseDate: _get_iso_8601_date_format(values?.startDate),
                                                dueDate: values?.endDate,
                                                teacherMessage: _removeWhiteSpace(values?.topicMessage),
                                                createdBy: decodedToken.sub,
                                                topicId: staticTopicId,
                                                classId,
                                                setByTeacherStepIds,
                                                setByTeacherStepMessages
                                            },
                                            file
                                        }
                                    })
                                        .then(() => {
                                            setOpen();
                                            resetForm({ values: '' });
                                            callSnackbar('New topic created', 'success');
                                        })
                                        .catch(showSaveError);
                                }}>
                                <Paragraph
                                    text={
                                        isReleasedClick
                                            ? `This topic has been set previously for this class (on ${showDate({ date: topicData?.releaseDate, short: true })})`
                                            : 'Some pupils have already been set this topic. Are you sure you want to schedule it?'
                                    }
                                />
                            </ConfirmationModal>
                        )}

                        {warningModalOpen && (
                            <ConfirmationModal
                                open={warningModalOpen}
                                onCancel={() => setWarningModalOpen(!warningModalOpen)}
                                loading={addClassTopicLoading || updateClassTopicLoading}
                                heading="Are you sure?"
                                btnText="Confirm"
                                onConfirm={() => {
                                    const token = getCookie(ACCESS_TOKEN_COOKIE);
                                    const decodedToken = getJwtDecoded(token);
                                    const { setByTeacherStepIds, setByTeacherStepMessages, file } = buildSetByTeacherData(values);

                                    isUpdatingTopic
                                        ? updateTopic({
                                              variables: {
                                                  input: {
                                                      id: topicData?.id,
                                                      releaseDate: _get_iso_8601_date_format(values?.startDate),
                                                      dueDate: values?.endDate,
                                                      teacherMessage: _removeWhiteSpace(values?.topicMessage),
                                                      setByTeacherStepIds,
                                                      setByTeacherStepMessages
                                                  },
                                                  file
                                              }
                                          })
                                              .then(() => {
                                                  setOpen();
                                                  resetForm({ values: '' });
                                                  callSnackbar('Changes saved', 'success');
                                              })
                                              .catch(showSaveError)
                                        : addTopic({
                                              variables: {
                                                  input: {
                                                      releaseDate: _get_iso_8601_date_format(values?.startDate),
                                                      dueDate: values?.endDate,
                                                      teacherMessage: _removeWhiteSpace(values?.topicMessage),
                                                      createdBy: decodedToken.sub,
                                                      topicId: topicData?.id,
                                                      classId,
                                                      setByTeacherStepIds,
                                                      setByTeacherStepMessages
                                                  },
                                                  file
                                              }
                                          })
                                              .then(() => {
                                                  setOpen();
                                                  resetForm({ values: '' });
                                                  callSnackbar('New topic created', 'success');
                                              })
                                              .catch(showSaveError);
                                }}>
                                <Paragraph text="This topic will not be released to any pupils as all pupils are in groups." />
                            </ConfirmationModal>
                        )}
                    </>
                );
            }}
        </Formik>
    );
};

UpdateTopicModal.propTypes = {
    open: PropTypes.bool.isRequired,
    setOpen: PropTypes.func.isRequired,
    topicData: PropTypes.object,
    primaryText: PropTypes.string,
    secondaryText: PropTypes.string,
    isReleasedClick: PropTypes.bool,
    isPreview: PropTypes.bool,
    isLoading: PropTypes.bool,
    showSetByTeacherDetails: PropTypes.bool,
    showScrapbookPrompt: PropTypes.bool
};

export default UpdateTopicModal;
