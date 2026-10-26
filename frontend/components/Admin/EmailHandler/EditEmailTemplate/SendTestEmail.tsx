/* eslint-disable @typescript-eslint/no-explicit-any */
import { gql, useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext, useEffect, useState } from 'react';

import { _phoneValidationRegex, handleErrorSnackbar, ThemeContext } from '../../../../shared/Services/handler';
import { sendTestEmailValidationForAdmin, sendTestPhoneValidationForAdmin } from '../../../../shared/validations';
import LWPButton from '../../../Shared/Button/LWPButton';
import DialogWrapper from '../../../Shared/DialogWrapper';
import InputField from '../../../Shared/InputField/InputField';
import { getEmailTemplates } from '../AutomatedMessages';

const sendTestEmail = gql`
    mutation sendTestEmail($input: TestEmailInput!) {
        sendTestEmail(input: $input) {
            response
            status
        }
    }
`;

const sendNotification = gql`
    mutation sendNotification($input: SendNotificationInput!) {
        sendNotification(input: $input)
    }
`;

interface SendTestEmailProps {
    open: boolean;
    input: any;
    setConfirmationModal: (value: any) => void;
    initialmodalState: any;
    hasTemplate: any;
    automated?: boolean;
}

const SendTestEmail = ({ open, input, hasTemplate, setConfirmationModal, initialmodalState, automated = false }: SendTestEmailProps) => {
    const { callSnackbar } = useContext(ThemeContext);

    const [_email, _setEmail] = useState('');
    const isPhoneNumber = _phoneValidationRegex(_email);

    const [sendTestEmailMutation, { loading: sendTestEmailLoading, error: sendTestEmailError }] = useMutation(
        automated ? sendNotification : sendTestEmail
    );

    useEffect(() => {
        handleErrorSnackbar(callSnackbar, sendTestEmailError);
    }, [sendTestEmailError]);

    return (
        <div>
            <DialogWrapper contentWidth={'580px'} open={open} heading="Send a test message" className="email_template_warning_modal">
                <Formik
                    initialValues={{
                        email: ''
                    }}
                    validationSchema={
                        isPhoneNumber
                            ? sendTestPhoneValidationForAdmin(hasTemplate?.sendSms)
                            : sendTestEmailValidationForAdmin(hasTemplate?.sendEmail)
                    }
                    onSubmit={async (val) => {
                        try {
                            const { email } = val;

                            await sendTestEmailMutation({
                                variables: {
                                    input: {
                                        ...input,
                                        ...(automated ? { recipient: email } : { sentTo: email })
                                    }
                                },
                                refetchQueries: [{ query: getEmailTemplates }]
                            }).then(() => {
                                callSnackbar('Test email send successfully', 'success');
                                setConfirmationModal(initialmodalState);
                            });
                        } catch (error) {
                            console.log('Error:', error);
                        }
                    }}>
                    {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => {
                        _setEmail(values.email);

                        return (
                            <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                                <div className="warning_modal_sub_heading">
                                    <InputField
                                        type="email"
                                        label="Email address or mobile number"
                                        md={8}
                                        lg={8}
                                        name="email"
                                        value={values.email}
                                        onChange={(e) => {
                                            handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                                        }}
                                        onBlur={handleBlur}
                                        error={errors.email}
                                        touched={touched.email}
                                    />
                                </div>
                                <br />
                                <br />
                                <div className="warning_modal_btns">
                                    <LWPButton
                                        variant="text"
                                        color="inherit"
                                        onClick={() => setConfirmationModal(initialmodalState)}
                                        disabled={sendTestEmailLoading}
                                        btnText="Cancel"
                                    />
                                    <LWPButton onClick={handleSubmit} btnText="Send" loading={sendTestEmailLoading} />
                                </div>
                            </Form>
                        );
                    }}
                </Formik>
            </DialogWrapper>
        </div>
    );
};

export default SendTestEmail;
