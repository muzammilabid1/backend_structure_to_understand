import { useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext, useState } from 'react';

import { sendNotification } from '../../../graphQl/mutations';
import { TestEmailType } from '../../../shared/Constant';
import { ThemeContext } from '../../../shared/Services/handler';
import { TestEmailForAdminValidation } from '../../../shared/validations';
import LWPButton from '../../Shared/Button/LWPButton';
import CommonSelectField from '../../Shared/CommonSelectField';
import InputField from '../../Shared/InputField/InputField';
import Heading2 from '../../Shared/Typography/Heading2';

const TestEmail = () => {
    const { callSnackbar } = useContext(ThemeContext);
    const [emailType, setEmailType] = useState(null);
    const [sendNotificationMutation, { loading }] = useMutation(sendNotification);

    const options = [
        {
            value: 'Invite Admin',
            key: TestEmailType.adminInvitationEmail
        },
        {
            value: 'Invite Parent',
            key: TestEmailType.parentInvitationEmail
        },
        {
            value: 'Invite School Leader',
            key: TestEmailType.schoolLeaderInvitationEmail
        },
        {
            value: 'All Pupil Signup',
            key: TestEmailType.sendMailForAllPupilSignUp
        },
        {
            value: 'One Third Pupil Signup',
            key: TestEmailType.sendMailForOneThirdPupilSignUp
        },
        {
            value: 'Topic Reminder After 7 Days',
            key: TestEmailType.sendMailForTopicReminderAfter7Days
        },
        {
            value: 'Two Third Pupil Signup',
            key: TestEmailType.sendMailForTwoThirdPupilSignUp
        },
        {
            value: 'Welcome Parent',
            key: TestEmailType.sendParentWelcomeMail
        },
        {
            value: 'Pupil Topics',
            key: TestEmailType.sendPupilTopics
        },
        {
            value: 'Question To Lwp Staff',
            key: TestEmailType.sendQuestionToLwpStaff
        },
        {
            value: 'Question To User',
            key: TestEmailType.sendQuestionToUser
        },
        {
            value: 'Reset Password',
            key: TestEmailType.sendResetPasswordEmail
        },
        {
            value: 'Teacher Assigned To Class',
            key: TestEmailType.sendTeacherAssignedToClass
        },
        {
            value: 'Teacher Topics To Be Released Tomorrow',
            key: TestEmailType.sendTeacherTopicsToBeReleasedTomorrow
        },
        {
            value: 'Welcome Teacher',
            key: TestEmailType.sendTeacherWelcomeMail
        },
        {
            value: 'Invite Teacher',
            key: TestEmailType.teacherInvitationEmail
        }
    ];

    // if (loading) return <CommonLoading />;

    return (
        <div className="schools_overview" data-test={'send-test-email-page'}>
            <div className="header">
                <Heading2 text="Send Email Testing" />
            </div>
            <br />
            <Formik
                initialValues={{
                    email: null,
                    invitedEmail: null,
                    schoolId: null,
                    pupilId: null,
                    schoolClassId: null,
                    pupilTopicId: null,
                    classTopicId: null,
                    question: null,
                    phoneNumber: null
                }}
                enableReinitialize
                validationSchema={TestEmailForAdminValidation}
                onSubmit={(values, { resetForm }) => {
                    const { email, invitedEmail, schoolId, pupilId, schoolClassId, pupilTopicId, classTopicId, question, phoneNumber } =
                        values;

                    sendNotificationMutation({
                        variables: {
                            input: {
                                type: emailType,
                                email,
                                invitedByEmail: invitedEmail,
                                schoolId: schoolId,
                                pupilId: pupilId,
                                schoolClassId: schoolClassId,
                                pupilTopicId: pupilTopicId,
                                classTopicId: classTopicId,
                                question,
                                phoneNumber
                            }
                        }
                    })
                        .then((res) => {
                            if (res?.data?.sendNotification) {
                                resetForm({
                                    values: {
                                        email: null,
                                        invitedEmail: null,
                                        schoolId: null,
                                        pupilId: null,
                                        schoolClassId: null,
                                        pupilTopicId: null,
                                        classTopicId: null,
                                        question: null,
                                        phoneNumber: null
                                    }
                                });
                                callSnackbar('Email Sent successfully', 'success');
                            } else {
                                callSnackbar(
                                    {
                                        graphQLErrors: [{ extensions: { exception: { status: 535 } } }],
                                        message: 'Email was not sent successfully'
                                    },
                                    'error'
                                );
                            }
                        })
                        .catch(({ ...err }) => {
                            callSnackbar(err, 'error');
                        });
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <CommonSelectField
                            label={'Email Type'}
                            options={options}
                            value={emailType}
                            md={12}
                            lg={12}
                            name="emailType"
                            error={errors.emailType}
                            touched={touched.emailType}
                            onChange={(e) => {
                                handleChange({
                                    target: { name: 'emailType', value: e.target.value }
                                });
                                setEmailType(e.target.value);
                            }}
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'emailType', value: e.target.value }
                                })
                            }
                        />
                        {emailType !== TestEmailType.sendTeacherTopicsToBeReleasedTomorrow && (
                            <InputField
                                type="email"
                                label="Email address"
                                md={12}
                                lg={12}
                                name="email"
                                value={values.email}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'email', value: e.target.value.toLowerCase() } });
                                }}
                                onBlur={handleBlur}
                                error={errors.email}
                                touched={touched.email}
                            />
                        )}
                        {(emailType === TestEmailType.parentInvitationEmail ||
                            emailType === TestEmailType.schoolLeaderInvitationEmail ||
                            emailType === TestEmailType.teacherInvitationEmail) && (
                            <InputField
                                type="email"
                                label="Invited Email address"
                                md={12}
                                lg={12}
                                name="invitedEmail"
                                value={values.invitedEmail}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'invitedEmail', value: e.target.value.toLowerCase() } });
                                }}
                                onBlur={handleBlur}
                                error={errors.invitedEmail}
                                touched={touched.invitedEmail}
                            />
                        )}
                        {(emailType === TestEmailType.schoolLeaderInvitationEmail ||
                            emailType === TestEmailType.teacherInvitationEmail) && (
                            <InputField
                                label="School ID"
                                md={12}
                                lg={12}
                                name="schoolId"
                                value={values.schoolId}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.schoolId}
                                touched={touched.schoolId}
                            />
                        )}
                        {(emailType === TestEmailType.sendMailForTopicReminderAfter7Days ||
                            emailType === TestEmailType.sendPupilTopics) && (
                            <InputField
                                label="Pupil ID"
                                md={12}
                                lg={12}
                                name="pupilId"
                                value={values.pupilId}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.pupilId}
                                touched={touched.pupilId}
                            />
                        )}
                        {(emailType === TestEmailType.sendMailForAllPupilSignUp ||
                            emailType === TestEmailType.sendMailForOneThirdPupilSignUp ||
                            emailType === TestEmailType.sendMailForTwoThirdPupilSignUp ||
                            emailType === TestEmailType.sendTeacherAssignedToClass) && (
                            <InputField
                                label="School Class ID"
                                md={12}
                                lg={12}
                                name="schoolClassId"
                                value={values.schoolClassId}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.schoolClassId}
                                touched={touched.schoolClassId}
                            />
                        )}
                        {emailType === TestEmailType.sendMailForTopicReminderAfter7Days && (
                            <InputField
                                label="Pupil Topic ID"
                                md={12}
                                lg={12}
                                name="pupilTopicId"
                                value={values.pupilTopicId}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.pupilTopicId}
                                touched={touched.pupilTopicId}
                            />
                        )}
                        {(emailType === TestEmailType.sendTeacherTopicsToBeReleasedTomorrow ||
                            emailType === TestEmailType.sendPupilTopics) && (
                            <InputField
                                label="Class Topic ID"
                                md={12}
                                lg={12}
                                name="classTopicId"
                                value={values.classTopicId}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.classTopicId}
                                touched={touched.classTopicId}
                            />
                        )}
                        {(emailType === TestEmailType.sendQuestionToLwpStaff || emailType === TestEmailType.sendQuestionToUser) && (
                            <InputField
                                label="Question"
                                md={12}
                                lg={12}
                                name="question"
                                value={values.question}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.question}
                                touched={touched.question}
                            />
                        )}
                        {emailType !== TestEmailType.sendTeacherTopicsToBeReleasedTomorrow && (
                            <InputField
                                label="Mobile number"
                                md={12}
                                lg={12}
                                name="phoneNumber"
                                value={values.phoneNumber}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.phoneNumber}
                                touched={touched.phoneNumber}
                            />
                        )}

                        <LWPButton btnText="Send Mail" onClick={handleSubmit} disabled={!emailType || loading} loading={loading} />
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default TestEmail;
