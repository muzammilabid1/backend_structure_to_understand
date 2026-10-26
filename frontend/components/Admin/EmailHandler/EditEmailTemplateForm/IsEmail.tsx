import { Grid } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import React from 'react';

import CommonCard from '../../../Shared/Cards/CommonCard';
import CommonCheckBox from '../../../Shared/CommonCheckBox';
import CommonEditor from '../../../Shared/CommonEditor';
import CommonError from '../../../Shared/CommonError';
import CommonRadioButton from '../../../Shared/CommonRadioButton';
import InputField from '../../../Shared/InputField/InputField';
import { EditEmailTemplateFormProps } from '.';
import CodePreview from './CodePreview';
import ParameterInfo from './ParameterInfo';

const IsEmail = ({
    values,
    handleChange,
    handleBlur,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    notificationEmailType,
    emailTemplatePreviewData
}: EditEmailTemplateFormProps) => {
    return (
        <div>
            <div className="email_option">
                <CommonRadioButton
                    name="emailOption"
                    value={values.emailOption}
                    error={errors.emailOption}
                    touched={touched.emailOption}
                    onChange={handleChange}
                    options={[
                        {
                            value: 'LAYOUT',
                            text: 'Fill email content on the layout'
                        },
                        {
                            value: 'HTML',
                            text: 'Write the whole email in HTML'
                        }
                    ]}
                />
            </div>

            {values?.emailOption !== 'LAYOUT' && (
                <>
                    <InputField
                        name="subject"
                        value={values.subject}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.subject}
                        touched={touched.subject}
                        label="Subject"
                        type="text"
                    />

                    <Grid container spacing={2}>
                        <InputField
                            name="senderName"
                            value={values.senderName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.senderName}
                            touched={touched.senderName}
                            label="Sender name"
                            type="text"
                            lg={6}
                            md={6}
                        />
                        <InputField
                            name="senderEmail"
                            value={values.senderEmail}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.senderEmail}
                            touched={touched.senderEmail}
                            label="Sender email"
                            type="email"
                            lg={6}
                            md={6}
                        />
                    </Grid>

                    <CodeMirror
                        placeholder="Layout code in HTML"
                        onChange={(value) => {
                            handleChange({
                                target: { name: 'wholeEmailContent', value }
                            } as unknown as React.ChangeEvent<HTMLInputElement>);
                        }}
                        value={values.wholeEmailContent}
                        width="100%"
                        className="resizable-editor"
                        onBlur={() => {
                            if (handleBlur) {
                                const event = {
                                    target: {
                                        name: 'wholeEmailContent',
                                        value: values?.wholeEmailContent
                                    }
                                } as unknown as React.FocusEvent<HTMLButtonElement | HTMLTextAreaElement | HTMLInputElement>;

                                handleBlur(event);
                            }
                        }}
                    />

                    <CommonError error={errors.wholeEmailContent} touched={touched.wholeEmailContent} />
                    <br />
                </>
            )}

            <CodePreview name="codePreview" setFieldValue={setFieldValue} emailTemplatePreviewData={emailTemplatePreviewData} />

            <br />

            <ParameterInfo type={notificationEmailType} preference="email" />

            <br />

            {values?.emailOption === 'LAYOUT' && (
                <>
                    <InputField
                        name="subject"
                        value={values.subject}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.subject}
                        touched={touched.subject}
                        label="Subject"
                        type="text"
                    />
                    <InputField
                        name="previewLine"
                        value={values.previewLine}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.previewLine}
                        touched={touched.previewLine}
                        label="Preview line"
                        type="text"
                    />
                    <Grid container spacing={2}>
                        <InputField
                            name="senderName"
                            value={values.senderName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            lg={6}
                            md={6}
                            error={errors.senderName}
                            touched={touched.senderName}
                            label="Sender name"
                            type="text"
                        />
                        <InputField
                            name="senderEmail"
                            value={values.senderEmail}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            lg={6}
                            md={6}
                            error={errors.senderEmail}
                            touched={touched.senderEmail}
                            label="Sender email"
                            type="email"
                        />
                    </Grid>
                    <InputField
                        label="Heading"
                        name="heading"
                        value={values.heading}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.heading}
                        touched={touched.heading}
                        type="text"
                    />
                    <CommonCard>
                        <CommonCheckBox
                            checked={values.editAsHtml}
                            onChange={() => setFieldValue('editAsHtml', !values.editAsHtml)}
                            label="Edit As Html"
                        />
                        <CommonEditor
                            value={values.bodyText}
                            editAsHtml={values.editAsHtml}
                            onChange={(newValue) => setFieldValue('bodyText', newValue)}
                            onBlur={() => setFieldTouched?.('bodyText', true)}
                        />
                        <CommonError error={errors?.bodyText} touched={touched?.bodyText} />
                    </CommonCard>
                    <br />
                    <InputField
                        name="linkText"
                        value={values.linkText}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.linkText}
                        touched={touched.linkText}
                        label="Link text"
                        type="text"
                    />
                    <InputField
                        name="link"
                        value={values.link}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.link}
                        touched={touched.link}
                        label="Link"
                        type="text"
                    />
                </>
            )}

            {/* <CommonCheckBox
                name="multipleSection"
                checked={values.multipleSection}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Allow sending as a section in a single email containing multiple messages"
                error={errors.multipleSection}
                touched={touched.multipleSection}
            />

            {values?.multipleSection && (
                <>
                    <InputField
                        label="Code for multiple sections"
                        name="multipleSectionContent"
                        value={values.multipleSectionContent}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.multipleSectionContent}
                        touched={touched.multipleSectionContent}
                        type="text"
                        multiline
                        rows={3}
                    />

                    <CodePreview
                        defaultTemplate={getParameterData?.getParameterByKey?.value ?? ''}
                        BODY={values?.multipleSectionContent}
                    />
                </>
            )} */}
        </div>
    );
};

export default IsEmail;
