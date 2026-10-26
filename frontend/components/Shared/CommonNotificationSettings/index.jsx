import { gql, useMutation } from '@apollo/client';
import { FormControl, RadioGroup } from '@mui/material';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import React, { useContext, useEffect } from 'react';

import { notificationPreferenceEnum, PARENT, unexpectedError } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { notificationSettingsValidation } from '../../../shared/validations';
import LWPButton from '../Button/LWPButton';
import CommonCheckBox from '../CommonCheckBox';
import Heading1 from '../Typography/Heading1';
import Paragraph from '../Typography/Paragraph';

// Mutations

const changeNotificationSettings = gql`
    mutation changeNotificationSettings($notificationSettingsInput: NotificationSettingsInput!) {
        changeNotificationSettings(notificationSettingsInput: $notificationSettingsInput) {
            id
        }
    }
`;

const CommonNotificationSettings = ({ userId, notificationPreference, viewType }) => {
    const { setHeaderTitle, callSnackbar } = useContext(ThemeContext);
    const [changeNotificationSettingsMutation, { loading }] = useMutation(changeNotificationSettings);

    useEffect(() => setHeaderTitle('Account settings'), []);

    const isEmailTrue = () =>
        notificationPreference === notificationPreferenceEnum.BOTH || notificationPreference === notificationPreferenceEnum.EMAILREMINDER;
    const isTextMessageTrue = () =>
        notificationPreference === notificationPreferenceEnum.BOTH || notificationPreference === notificationPreferenceEnum.SMSREMINDER;

    return (
        <Formik
            initialValues={{
                email: isEmailTrue(),
                textMessage: isTextMessageTrue()
            }}
            validationSchema={notificationSettingsValidation}
            enableReinitialize
            onSubmit={async (values) => {
                try {
                    await changeNotificationSettingsMutation({
                        variables: { notificationSettingsInput: { userId, forEmail: values.email, forTextMessage: values.textMessage } }
                    });
                    callSnackbar('Notification settings updated', 'success');
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
            {({ values, handleChange, handleSubmit }) => {
                return (
                    <div className="notification-settings-container">
                        <Form>
                            <Heading1
                                text="Notification settings"
                                customClass={`${viewType === PARENT ? 'mt16' : ''} pb8 account-settings-heading`}
                            />
                            <FormControl component="fieldset" className="radio-formcontrol" classes={{ root: 'root' }}>
                                <RadioGroup name="radioGroup" value={values.sharingAllowed} onChange={handleChange}>
                                    <Paragraph
                                        text={`${
                                            viewType === PARENT ? 'I am happy to' : 'This user will'
                                        } receive reminders for tasks that ${
                                            viewType === PARENT ? 'we' : 'they'
                                        } have not completed yet by:`}
                                    />
                                    <div className="ml8 mt4">
                                        <CommonCheckBox
                                            disabled={loading}
                                            name="email"
                                            checked={values.email}
                                            onChange={handleChange}
                                            label="Email"
                                        />
                                    </div>
                                    <div className="ml8 mt4">
                                        <CommonCheckBox
                                            disabled={loading}
                                            name="textMessage"
                                            checked={values.textMessage}
                                            onChange={handleChange}
                                            label="Text message"
                                        />
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <LWPButton
                                customClass={'mb-10'}
                                btnText="Save notification settings"
                                loading={loading}
                                disabled={loading}
                                onClick={handleSubmit}
                            />
                        </Form>
                    </div>
                );
            }}
        </Formik>
    );
};

CommonNotificationSettings.propTypes = {
    userId: PropTypes.number.isRequired,
    notificationPreference: PropTypes.string.isRequired,
    viewType: PropTypes.string.isRequired
};

CommonNotificationSettings.defaultProps = {
    viewType: PARENT
};

export default CommonNotificationSettings;
