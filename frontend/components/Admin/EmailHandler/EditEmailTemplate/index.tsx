/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Chip, Divider, Grid } from '@mui/material';
import { useFormik } from 'formik';
import { isEqual } from 'lodash';
import { useRouter } from 'next/compat/router';
import { useParams, useSearchParams } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

import {
    handleErrorSnackbar,
    parseErrorDetails,
    showDate,
    splitCamelCaseToString,
    ThemeContext
} from '../../../../shared/Services/handler';
import { emailHandlerValidation } from '../../../../shared/validations';
import { EmailTemplateStatus, IAddEmailTemplateInput, UseEmailOption } from '../../../../types';
import LWPButton from '../../../Shared/Button/LWPButton';
import CommonLoading from '../../../Shared/CommonLoading';
import CommonSnackbar from '../../../Shared/CommonSnackbar';
import DialogWrapper from '../../../Shared/DialogWrapper';
import ConfirmationModal from '../../../Shared/Modals/ConfirmationModal';
import Heading2 from '../../../Shared/Typography/Heading2';
import Paragraph from '../../../Shared/Typography/Paragraph';
import EditEmailTemplateForm, { valuesProps } from '../EditEmailTemplateForm';
import SendTestEmail from './SendTestEmail';

const getEmailTemplateForEditEmailTemplate = gql`
    query getEmailTemplate($id: String!) {
        getEmailTemplate(id: $id) {
            id
            type
            subject
            previewLine
            senderName
            senderEmail
            logCreatedAt
            sendEmail
            linkText
            link
            heading
            wholeEmailContent
            emailOption
            sendSms
            smsContent
            multipleSection
            multipleSectionContent
            bodyText
            sendPhoneNotification
            notificationTitle
            notificationDescription
            notificationUrl
            status
            logUpdatedAt
            draft {
                id
                subject
                previewLine
                senderName
                senderEmail
                type
                sendEmail
                linkText
                link
                heading
                wholeEmailContent
                emailOption
                sendSms
                smsContent
                multipleSection
                multipleSectionContent
                bodyText
                sendPhoneNotification
                notificationTitle
                notificationDescription
                notificationUrl
                status
                logUpdatedAt
            }
        }
    }
`;

const createEmailTemplateForEditEmailTemplate = gql`
    mutation createEmailTemplate($input: AddEmailTemplateInput!) {
        createEmailTemplate(input: $input) {
            id
        }
    }
`;

const updateEmailTemplateForEditEmailTemplate = gql`
    mutation updateEmailTemplate($input: UpdateEmailTemplateInput!) {
        updateEmailTemplate(input: $input) {
            id
        }
    }
`;

// const deleteEmailTemplate = gql`
//     mutation deleteEmailTemplate($id: Float!) {
//         deleteEmailTemplate(id: $id) {
//             status
//             msg
//         }
//     }
// `;

const emailTemplatePreview = gql`
    query emailTemplatePreview($input: EmailTemplatePreviewInput!) {
        emailTemplatePreview(input: $input)
    }
`;

const removeDraftEmailTemplateForEditEmailTemplate = gql`
    mutation removeDraftEmailTemplate($id: String!) {
        removeDraftEmailTemplate(id: $id) {
            status
        }
    }
`;

const EditEmailTemplate = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const queryParams = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialmodalState = { deleteItem: false, discardItem: false, testEmail: false };
    const initialErrorMessage = { open: false, message: null };

    const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
    const [openConfirmationModal, setConfirmationModal] = useState(initialmodalState);
    const [routePush, setRoutePush] = useState(false);
    const [forceRerender, setForceRerender] = useState(true);
    const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
    const [isActivatingTemplate, setIsActivatingTemplate] = useState<boolean>(false);

    const type = searchParams.get('type');

    const {
        data: getEmailData,
        loading: getEmailLoading,
        error: getEmailError
    } = useQuery(getEmailTemplateForEditEmailTemplate, {
        variables: {
            id: queryParams?.template_id
        },
        skip: null == queryParams?.template_id
    });

    const [createEmailTemplateMutation, { error: createEmailTemplateError }] = useMutation(createEmailTemplateForEditEmailTemplate);

    const [emailTemplatePreviewQuery, { data: emailTemplatePreviewData }] = useLazyQuery(emailTemplatePreview);

    const [updateEmailTemplateMutation, { error: updateEmailTemplateError }] = useMutation(updateEmailTemplateForEditEmailTemplate, {
        refetchQueries: [
            {
                query: getEmailTemplateForEditEmailTemplate,
                variables: { id: queryParams?.template_id }
            }
        ],
        awaitRefetchQueries: true
    });

    const [handleResetDraftTemplate, { loading: removeDraftEmailTemplateLoading }] = useMutation(
        removeDraftEmailTemplateForEditEmailTemplate
    );

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, getEmailError);
        handleErrorSnackbar(callSnackbar, createEmailTemplateError);
        handleErrorSnackbar(callSnackbar, updateEmailTemplateError);
    }, [getEmailError, createEmailTemplateError, updateEmailTemplateError]);

    const emailData = getEmailData?.getEmailTemplate;

    const isDraftTemplate = () => !!emailData?.draft;

    const emailContent = isDraftTemplate() ? emailData?.draft : emailData;

    const notificationEmailType = type ? type : emailData?.type;

    const initialValues = {
        email: emailContent?.sendEmail ?? true,
        emailOption: emailContent?.emailOption ?? UseEmailOption.LAYOUT,
        subject: emailContent?.subject ?? '',
        previewLine: emailContent?.previewLine ?? '',
        heading: emailContent?.heading ?? '',
        senderName: emailContent?.senderName ?? '',
        senderEmail: emailContent?.senderEmail ?? '',
        linkText: emailContent?.linkText ?? '',
        link: emailContent?.link ?? '',
        wholeEmailContent: emailContent?.wholeEmailContent ?? '',

        multipleSection: emailContent?.multipleSection ?? false,
        multipleSectionContent: emailContent?.multipleSectionContent ?? '',

        codePreview: 'Desktop',
        editAsHtml: false,
        bodyText: emailContent?.bodyText ?? null,

        sms: emailContent?.sendSms ?? false,
        smsContent: emailContent?.smsContent ?? '',

        notifications: emailContent?.sendPhoneNotification ?? false,
        notificationTitle: emailContent?.notificationTitle ?? '',
        notificationDescription: emailContent?.notificationDescription ?? '',
        notificationUrl: emailContent?.notificationUrl ?? '',
        status: EmailTemplateStatus.CURRENT
    };

    const onSubmitHandler = async (values: valuesProps) => {
        setRoutePush(true);

        const payload: IAddEmailTemplateInput = {
            id: queryParams?.template_id ? (queryParams?.template_id as string) : undefined,
            type: emailData?.type ?? type,
            status: values?.status,
            sendEmail: values?.email,
            sendSms: values?.sms,
            sendPhoneNotification: values?.notifications,
            subject: values?.subject,
            senderName: values?.senderName,
            senderEmail: values?.senderEmail,
            emailOption: UseEmailOption.LAYOUT,
            multipleSection: false
        };

        if (values?.email) {
            payload.emailOption = UseEmailOption[values?.emailOption];
            payload.multipleSection = values?.multipleSection;

            if (values?.emailOption === 'LAYOUT') {
                payload.heading = values?.heading;
                payload.bodyText = values?.bodyText;
                payload.linkText = values?.linkText;
                payload.link = values?.link;
                payload.previewLine = values?.previewLine;
            } else {
                payload.wholeEmailContent = values?.wholeEmailContent;
            }

            if (values?.multipleSection) {
                payload.multipleSectionContent = values?.multipleSectionContent;
            }
        }

        if (values?.sms) {
            payload.smsContent = values?.smsContent;
        }

        if (values?.notifications) {
            payload.notificationTitle = values?.notificationTitle;
            payload.notificationDescription = values?.notificationDescription;
            payload.notificationUrl = values?.notificationUrl;
        }

        if (queryParams?.template_id) {
            await updateEmailTemplateMutation({
                variables: {
                    input: payload
                }
            });
        } else {
            await createEmailTemplateMutation({
                variables: {
                    input: payload
                }
            });
        }
    };

    const { values, handleChange, handleSubmit, errors, touched, handleBlur, setFieldValue, setValues, setFieldTouched } = useFormik({
        initialValues: initialValues,
        validationSchema: emailHandlerValidation,
        validateOnChange: false,
        enableReinitialize: true,
        onSubmit: async (values) => {
            setRoutePush(true);

            if (values.status === EmailTemplateStatus.DRAFT) setIsSavingDraft(true);
            else setIsActivatingTemplate(true);

            try {
                await templatePreview(values);
                await onSubmitHandler(values);
                callSnackbar(queryParams?.template_id ? 'Updated' : 'Saved', 'success');
                router?.push(`/admin/email-templates`);
            } catch (error) {
                setErrorMessage({
                    open: true,
                    message: parseErrorDetails(error)
                });
                setRoutePush(false);
            } finally {
                setIsSavingDraft(false);
                setIsActivatingTemplate(false);
            }
        }
    });

    const templatePreview = async (value: valuesProps) => {
        return new Promise((resolve, reject) => {
            return emailTemplatePreviewQuery({
                variables: {
                    input: {
                        heading: value?.heading,
                        smsContent: value?.smsContent,
                        bodyText: value?.bodyText,
                        previewLine: value?.previewLine,
                        wholeEmailContent: value?.wholeEmailContent,
                        emailOption: value?.emailOption,
                        codePreview: value?.codePreview,
                        link: value?.link,
                        linkText: value?.linkText
                    }
                }
            })
                .then((result) => {
                    if (result.error) {
                        reject(result.error);
                    }

                    resolve(result);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    };

    const handleCustomBlur = async (e: React.FocusEvent<any, Element>) => {
        handleBlur(e);
        templatePreview(values).catch((err) =>
            setErrorMessage({
                open: true,
                message: parseErrorDetails(err)
            })
        );
    };

    useEffect(() => {
        if (emailData) {
            if (forceRerender) {
                setForceRerender(false);
            } else {
                setValues(initialValues);
                templatePreview(initialValues).catch((err) => console.log(err));
            }
        }
    }, [getEmailData, forceRerender]);

    useEffect(() => {
        if (values && !forceRerender) {
            templatePreview(values).catch((err) => console.log(err));
        }
    }, [values?.codePreview, values?.emailOption]);

    const isSame = isEqual(initialValues, values);

    useEffect(() => {
        if (!routePush) {
            const handleWindowClose = (e: BeforeUnloadEvent) => {
                if (isSame) return;

                e.preventDefault();
            };

            const handleBrowseAway = () => {
                if (isSame) return;

                history.go(1);
                setConfirmationModal({ ...initialmodalState, discardItem: true });
                router?.events.emit('routeChangeError');
                throw 'routeChange aborted.';
            };

            window.addEventListener('beforeunload', handleWindowClose);
            router?.events.on('routeChangeStart', handleBrowseAway);

            return () => {
                window.removeEventListener('beforeunload', handleWindowClose);
                router?.events.off('routeChangeStart', handleBrowseAway);
            };
        }
    }, [router, openConfirmationModal, isSame, routePush]);

    const handleDraft = async () => {
        setFieldValue('status', EmailTemplateStatus.DRAFT);
        handleSubmit();
    };

    const handleReset = async () => {
        try {
            const res = await handleResetDraftTemplate({
                variables: { id: emailContent?.id },
                refetchQueries:
                    emailData?.status == EmailTemplateStatus.DRAFT
                        ? []
                        : [
                              {
                                  query: getEmailTemplateForEditEmailTemplate,
                                  variables: { id: queryParams?.template_id }
                              }
                          ],
                awaitRefetchQueries: true
            });

            if (res.errors?.length) throw new Error(res?.errors?.[0]?.message);
            callSnackbar('Email template reset successfully!', 'success');
            setConfirmationModal(initialmodalState);
            if (emailData?.status == EmailTemplateStatus.DRAFT) {
                router.replace(`/admin/email-templates/edit-email?type=${emailContent?.type}`);
            }
        } catch (err) {
            callSnackbar(err, 'error');
            setConfirmationModal(initialmodalState);
            setRoutePush(false);
        }
    };

    if (getEmailLoading) return <CommonLoading />;

    return (
        <div className="edit_email_template">
            <LWPButton
                btnText="Back to email templates"
                startIcon="navigate_before"
                color="inherit"
                variant="text"
                onClick={() =>
                    !isSame ? setConfirmationModal({ ...initialmodalState, discardItem: true }) : router?.push(`/admin/email-templates`)
                }
            />
            {isDraftTemplate() ? (
                <>
                    <br />
                    <br />
                    <Chip label={`Draft email`} size="small" style={{ background: '#FDC300' }} />
                </>
            ) : null}

            <br />
            <br />
            <div className="edit_email_heading">
                <Heading2 text={splitCamelCaseToString(notificationEmailType ?? '')} />
                {isDraftTemplate() ? (
                    <LWPButton
                        onClick={() => setConfirmationModal({ ...initialmodalState, deleteItem: true })}
                        customClass="remove-message-btn"
                        btnText="Reset message"
                        endIcon="rotate_left"
                    />
                ) : (
                    ''
                )}
            </div>
            <br />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!type ? (
                    <Paragraph>
                        Last published at: <strong>{showDate({ date: emailData?.logUpdatedAt, time: true })}</strong>
                    </Paragraph>
                ) : (
                    ''
                )}

                {isDraftTemplate() ? (
                    <>
                        <Divider orientation="vertical" variant="middle" flexItem style={{ height: 10 }} />
                        <Paragraph>
                            Draft updated at: <strong>{showDate({ date: emailContent?.logUpdatedAt, time: true })}</strong>
                        </Paragraph>
                    </>
                ) : null}
            </div>

            <EditEmailTemplateForm
                values={values}
                setFieldValue={setFieldValue}
                setFieldTouched={setFieldTouched}
                handleChange={handleChange}
                handleBlur={handleCustomBlur}
                errors={errors}
                touched={touched}
                notificationEmailType={notificationEmailType}
                emailTemplatePreviewData={emailTemplatePreviewData?.emailTemplatePreview}
                templatePreview={templatePreview}
                setErrorMessage={setErrorMessage}
            />
            <br />
            <br />
            <LWPButton
                btnText="Send a test message"
                onClick={async () => {
                    try {
                        await templatePreview(values);
                        setConfirmationModal({ ...initialmodalState, testEmail: true });
                    } catch (error) {
                        setErrorMessage({
                            open: true,
                            message: parseErrorDetails(error)
                        });
                        setRoutePush(false);
                    }
                }}
                color="inherit"
            />
            <br />
            <br />
            <div style={{ display: 'flex', gap: 40 }}>
                <div style={{ display: 'flex', gap: 40 }}>
                    <LWPButton
                        onClick={() =>
                            !isSame
                                ? setConfirmationModal({ ...initialmodalState, discardItem: true })
                                : router?.push(`/admin/email-templates`)
                        }
                        btnText="Cancel"
                        color="inherit"
                        variant="text"
                    />

                    <LWPButton
                        btnText="Save as a draft"
                        onClick={() => {
                            setFieldValue('status', EmailTemplateStatus.DRAFT);
                            handleSubmit();
                        }}
                        disabled={isSavingDraft}
                        loading={isSavingDraft}
                        style={{ width: '100%' }}
                        color="inherit"
                    />

                    <LWPButton
                        btnText="Save and activate"
                        onClick={() => {
                            setFieldValue('status', EmailTemplateStatus.CURRENT);
                            handleSubmit();
                        }}
                        disabled={isActivatingTemplate}
                        loading={isActivatingTemplate}
                    />
                </div>
            </div>
            {openConfirmationModal?.deleteItem && (
                <ConfirmationModal
                    open={openConfirmationModal?.deleteItem}
                    onCancel={() => setConfirmationModal(initialmodalState)}
                    loading={removeDraftEmailTemplateLoading}
                    heading="Reset message?"
                    btnText="Reset"
                    btnClass="remove-message-btn"
                    primaryBtnEndIcon="rotate_left"
                    onConfirm={handleReset}>
                    <Paragraph text="Are you sure you want to reset this?" />
                </ConfirmationModal>
            )}

            <DialogWrapper contentWidth={'580px'} open={openConfirmationModal?.discardItem} heading="Discard changes?">
                <div className="warning_modal_sub_heading">
                    Are you sure you want to discard this? you can also save it as a draft and edit back later
                </div>
                <Grid mt={4} gap={2} justifyContent={'flex-end'} display={'flex'}>
                    <LWPButton variant="text" color="inherit" onClick={() => setConfirmationModal(initialmodalState)} btnText="Cancel" />
                    <LWPButton variant="contained" color="inherit" onClick={handleDraft} btnText="Save draft" />
                    <LWPButton
                        onClick={() => {
                            setRoutePush(true);
                            router?.push(`/admin/email-templates`);
                        }}
                        customClass="remove-message-btn"
                        btnText="Discard changes"
                        endIcon="restart_alt"
                        dataTest="dialog-primary-btn"
                    />
                </Grid>
            </DialogWrapper>

            <SendTestEmail
                open={openConfirmationModal?.testEmail}
                input={{
                    subject: values?.subject,
                    senderEmail: values?.senderEmail,
                    senderName: values?.senderName,
                    type: notificationEmailType,
                    heading: values?.heading,
                    bodyText: values?.bodyText,
                    wholeEmailContent: values?.wholeEmailContent,
                    smsContent: values?.smsContent,
                    linkText: values?.linkText,
                    link: values?.link,
                    previewLine: values?.previewLine,
                    emailOption: values?.emailOption
                }}
                setConfirmationModal={setConfirmationModal}
                initialmodalState={initialmodalState}
                hasTemplate={{ sendSms: values?.sms, sendEmail: values?.email }}
            />

            <CommonSnackbar
                open={errorMessage?.open}
                type="error"
                autoHideDuration={30000}
                message={errorMessage?.message}
                onClose={() => setErrorMessage(initialErrorMessage)}
                className="error_snackbar"
            />
        </div>
    );
};

export default EditEmailTemplate;
