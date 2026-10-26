/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import { EmailTemplateStatus } from '../../../../types';
import CommonCheckBox from '../../../Shared/CommonCheckBox';
import CommonError from '../../../Shared/CommonError';
import Heading1 from '../../../Shared/Typography/Heading1';
import IsEmail from './IsEmail';
import IsSms from './IsSms';

// Define a type for the props
export interface valuesProps {
    email: boolean;
    emailOption: string;
    subject: string;
    previewLine: string;
    senderName: string;
    senderEmail: string;
    heading: string;
    linkText: string;
    link: string;
    codePreview: any;
    editAsHtml: boolean;
    bodyText: string;
    multipleSection: boolean;
    wholeEmailContent: string;
    multipleSectionContent: string;
    sms: boolean;
    smsContent: string;
    notifications: boolean;
    notificationTitle: string;
    notificationDescription: string;
    notificationUrl: string;
    status: EmailTemplateStatus;
}

export interface EditEmailTemplateFormProps {
    values?: valuesProps;
    setFieldValue?: (field: string, value: any, shouldValidate?: boolean) => void;
    setFieldTouched?: (field: string, value: boolean) => void;
    handleChange?: (e: React.ChangeEvent<any>) => void;
    handleBlur?: React.FocusEventHandler<any>;
    errors?: { [key: string]: any };
    touched?: { [key: string]: any };
    notificationEmailType?: string;
    emailTemplatePreviewData?: string;
    templatePreview?: any;
    setErrorMessage?: any;
}

const EditEmailTemplateForm = ({
    values,
    handleChange,
    handleBlur,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    notificationEmailType,
    emailTemplatePreviewData,
    templatePreview,
    setErrorMessage
}: EditEmailTemplateFormProps) => {
    return (
        <>
            <Heading1 text="Email" />
            <CommonCheckBox
                name="email"
                checked={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Send an email"
                error={errors.email}
                touched={touched.email}
            />
            {values.email && (
                <IsEmail
                    values={values}
                    setFieldValue={setFieldValue}
                    setFieldTouched={setFieldTouched}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    touched={touched}
                    notificationEmailType={notificationEmailType}
                    emailTemplatePreviewData={emailTemplatePreviewData}
                    templatePreview={templatePreview}
                    setErrorMessage={setErrorMessage}
                />
            )}
            <Heading1 text="SMS" />
            <CommonCheckBox
                name="sms"
                checked={values.sms}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Send an SMS"
                error={errors.sms}
                touched={touched.sms}
            />
            {values.sms && (
                <IsSms
                    values={values}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    touched={touched}
                    notificationEmailType={notificationEmailType}
                />
            )}
            {/* <Heading1 text="Phone notifications" />
            <CommonCheckBox
                name="notifications"
                checked={values.notifications}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Send phone notifications"
                error={errors.notifications}
                touched={touched.notifications}
            />
            {values.notifications && (
                <IsNotifications
                    values={values}
                    setFieldValue={setFieldValue}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                    errors={errors}
                    touched={touched}
                    notificationEmailType={notificationEmailType}
                />
            )} */}
            <CommonError error={errors?.isSelected} touched={true} />
        </>
    );
};

export default EditEmailTemplateForm;
