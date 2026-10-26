import { gql, useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext } from 'react';

import { unexpectedError } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { ThemeContext } from '../../../shared/Services/handler';
import { reminderEmailValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonSelectField from '../../Shared/CommonSelectField';
import DateField from '../../Shared/InputField/DateField';
import Heading2 from '../../Shared/Typography/Heading2';

const sendReminderEmails = gql`
    mutation sendReminderEmails($scheduleDate: DateTime!, $type: EmailTemplateTypeForReminderEmail!) {
        sendReminderEmails(scheduleDate: $scheduleDate, type: $type)
    }
`;

const RunScheduledCronJob = () => {
    const [handleSendScheduleEmails, { loading }] = useMutation(sendReminderEmails);
    const { callSnackbar } = useContext(ThemeContext);

    return (
        <div className="schedule-cron-job">
            <Heading2 text="Reminder Emails" />
            <Formik
                initialValues={{
                    scheduleDate: new Date(),
                    type: ''
                }}
                validationSchema={reminderEmailValidation}
                onSubmit={async (values) => {
                    try {
                        const res = await handleSendScheduleEmails({
                            variables: {
                                type: values?.type,
                                scheduleDate: values?.scheduleDate
                            }
                        });

                        if (res?.errors?.length) throw Error(res?.errors);

                        const jobOption = sharedJson?.schdule_cron_job_options.find((job) => job?.key === values?.type);

                        callSnackbar(`Success: ${jobOption.value} Successfully!`, 'success');
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
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <CommonSelectField
                            label="Remiders"
                            options={sharedJson?.schdule_cron_job_options}
                            value={values.type}
                            error={errors.type}
                            touched={touched.type}
                            md={12}
                            lg={12}
                            onChange={(e) =>
                                handleChange({
                                    target: { name: 'type', value: e.target.value }
                                })
                            }
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'type', value: e.target.value }
                                })
                            }
                            dataTest="admin-topic-reminders-select"
                        />
                        <DateField
                            name="scheduleDate"
                            id="date"
                            label="Date"
                            md={6}
                            lg={6}
                            value={values.scheduleDate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.scheduleDate}
                            touched={touched.scheduleDate}
                            dataTest="admin-topic-reminders-date-input"
                        />

                        <LWPButton
                            customClass="release-pupil-topic-btn"
                            btnText={'Send reminder email'}
                            onClick={handleSubmit}
                            dataTest="admin-topic-reminders-submit-button"
                            loading={loading}
                        />
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default RunScheduledCronJob;
