import { gql, useMutation } from '@apollo/client';
import { Form, Formik } from 'formik';
import React, { useContext } from 'react';

import {
    adminCreateReadingTopics,
    adminlogsCleanUp,
    adminSendReleasedPupilTopicNotifications,
    adminSendTrophyMailToPupil,
    adminSendTrophyMailToSchoolLeader,
    adminSendTrophyMailToTeacher,
    adminTeacherMoneySkillsFirstTopicScheduled,
    adminTeacherTopicsToBeReleasedNextWeek,
    adminTeacherTopicsToBeReleasedTomorrow,
    adminTopicReminderAfter7Days,
    readingTopicReminders,
    refreshAllDataQueries,
    reimportSchoolsWondeData,
    runHourlySqlQueries,
    runNightlySqlQueries,
    sendTeacherReadingTopicEnd,
    trophiesAssignedToPupils,
    updateNoLinkedParentStatusOfPupils
} from '../../../graphQl/mutations';
import { CronJobOptions } from '../../../shared/Constant';
import sharedJson from '../../../shared/json/index.json';
import { ThemeContext } from '../../../shared/Services/handler';
import { cronJobSelectValidation } from '../../../shared/validations';
import LWPButton from './../../Shared/Button/LWPButton';
import CommonSelectField from './../../Shared/CommonSelectField';
import Heading2 from './../../Shared/Typography/Heading2';

// Mutations

const updateAllInterstitialFormsContext = gql`
    mutation updateAllInterstitialFormsContext {
        updateAllInterstitialFormsContext
    }
`;

const sendAllPendingNotificationsForCronJobSelect = gql`
    mutation sendAllPendingNotifications {
        sendAllPendingNotifications
    }
`;

const sendParentNotificationOfTeacherReadingCommentForCronJobSelect = gql`
    mutation sendParentNotificationOfTeacherReadingComment {
        sendParentNotificationOfTeacherReadingComment
    }
`;
const sendParentNotificationOfTeacherFeedbackReplyForCronJobSelect = gql`
    mutation sendParentNotificationOfTeacherFeedbackReply {
        sendParentNotificationOfTeacherFeedbackReply
    }
`;
const updateAllGroupAcrossClassesLicenseDetailsForCronJobSelect = gql`
    mutation updateAllGroupAcrossClassesLicenseDetails {
        updateAllGroupAcrossClassesLicenseDetails
    }
`;

const updateRegionInSchoolFromWondeData = gql`
    mutation updateRegionInSchoolFromWondeData {
        updateRegionInSchoolFromWondeData
    }
`;

const CronJobSelect = () => {
    const { callSnackbar } = useContext(ThemeContext);

    const [trophiesAssignedToPupilsMutation, { loading: trophiesAssignedToPupilsLoading }] = useMutation(trophiesAssignedToPupils);
    const [adminSendReleasedPupilTopicNotificationsMutation, { loading: adminSendReleasedPupilTopicNotificationsLoading }] = useMutation(
        adminSendReleasedPupilTopicNotifications
    );
    const [adminTeacherTopicsToBeReleasedTomorrowMutation, { loading: adminTeacherTopicsToBeReleasedTomorrowLoading }] = useMutation(
        adminTeacherTopicsToBeReleasedTomorrow
    );
    const [adminTeacherTopicsToBeReleasedNextWeekMutation, { loading: adminTeacherTopicsToBeReleasedNextWeekLoading }] = useMutation(
        adminTeacherTopicsToBeReleasedNextWeek
    );
    const [adminTeacherMoneySkillsFirstTopicScheduledMutation, { loading: adminTeacherMoneySkillsFirstTopicScheduledLoading }] =
        useMutation(adminTeacherMoneySkillsFirstTopicScheduled);
    const [adminTopicReminderAfter7DaysMutation, { loading: adminTopicReminderAfter7DaysLoading }] =
        useMutation(adminTopicReminderAfter7Days);
    const [adminSendTrophyMailToPupilMutation, { loading: adminSendTrophyMailToPupilLoading }] = useMutation(adminSendTrophyMailToPupil);
    const [adminSendTrophyMailToTeacherMutation, { loading: adminSendTrophyMailToTeacherLoading }] =
        useMutation(adminSendTrophyMailToTeacher);
    const [
        updateAllGroupAcrossClassesLicenseDetailsForCronJobSelectMutation,
        { loading: updateAllGroupAcrossClassesLicenseDetailsForCronJobSelectLoading }
    ] = useMutation(updateAllGroupAcrossClassesLicenseDetailsForCronJobSelect);
    const [adminSendTrophyMailToSchoolLeaderMutation, { loading: adminSendTrophyMailToSchoolLeaderLoading }] =
        useMutation(adminSendTrophyMailToSchoolLeader);
    const [adminlogsCleanUpMutation, { loading: adminlogsCleanUpLoading }] = useMutation(adminlogsCleanUp);
    const [adminCreateReadingTopicsMutation, { loading: adminCreateReadingTopicsLoading }] = useMutation(adminCreateReadingTopics);
    const [readingTopicRemindersMutation, { loading: readingTopicRemindersLoading }] = useMutation(readingTopicReminders);
    const [sendTeacherReadingTopicEndMutation, { loading: sendTeacherReadingTopicEndLoading }] = useMutation(sendTeacherReadingTopicEnd);
    const [refreshAllAdminQueriesMutation, { loading: refreshAllAdminQueriesLoading }] = useMutation(refreshAllDataQueries);
    const [reimportSchoolsWondeMutation, { loading: reimportSchoolsWondeLoading }] = useMutation(reimportSchoolsWondeData);
    const [updateNoLinkedParentStatusOfPupilsMutation, { loading: updateNoLinkedParentStatusOfPupilsLoading }] =
        useMutation(updateNoLinkedParentStatusOfPupils);
    const [runHourlySqlQueriesMutation, { loading: runHourlySqlQueriesLoading }] = useMutation(runHourlySqlQueries);
    const [runNightlySqlQueriesMutation, { loading: runNightlySqlQueriesLoading }] = useMutation(runNightlySqlQueries);
    const [sendAllPendingNotificationsForCronJobSelectMutation, { loading: sendAllPendingNotificationsForCronJobSelectLoading }] =
        useMutation(sendAllPendingNotificationsForCronJobSelect);
    const [updateAllInterstitialFormsContextMutation, { loading: updateAllInterstitialFormsContextLoading }] =
        useMutation(updateAllInterstitialFormsContext);
    const [
        sendParentNotificationOfTeacherReadingCommentForCronJobSelectMutation,
        { loading: sendParentNotificationOfTeacherReadingCommentForCronJobSelectLoading }
    ] = useMutation(sendParentNotificationOfTeacherReadingCommentForCronJobSelect);

    const [
        sendParentNotificationOfTeacherFeedbackReplyForCronJobSelectMutation,
        { loading: sendParentNotificationOfTeacherFeedbackReplyForCronJobSelectLoading }
    ] = useMutation(sendParentNotificationOfTeacherFeedbackReplyForCronJobSelect);

    const [updateRegionInSchoolFromWondeDataMutation, { loading: updateRegionInSchoolFromWondeDataLoading }] =
        useMutation(updateRegionInSchoolFromWondeData);

    return (
        <div className="cron-jobs-container">
            <Heading2 text="Select Cron Job" />
            <Formik
                initialValues={{
                    cronJob: sharedJson?.cron_job_options?.[0]?.key
                }}
                enableReinitialize
                validationSchema={cronJobSelectValidation}
                onSubmit={(values) => {
                    switch (values?.cronJob) {
                        case CronJobOptions.trophiesAssignedToPupils:
                            trophiesAssignedToPupilsMutation()
                                .then(() => {
                                    callSnackbar('Success: Trophies assigned to pupils successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendReleasedPupilTopicNotifications:
                            adminSendReleasedPupilTopicNotificationsMutation()
                                .then(() => {
                                    callSnackbar('Success: Pupil topic notifications sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.teacherTopicsToBeReleasedTomorrow:
                            adminTeacherTopicsToBeReleasedTomorrowMutation()
                                .then(() => {
                                    callSnackbar('Success: Teacher notification of upcoming topics sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.teacherTopicsToBeReleasedNextWeek:
                            adminTeacherTopicsToBeReleasedNextWeekMutation()
                                .then(() => {
                                    callSnackbar('Success: Teacher notification of topics released next week sent!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.teacherMoneySkillsFirstTopicScheduled:
                            adminTeacherMoneySkillsFirstTopicScheduledMutation()
                                .then(() => {
                                    callSnackbar('Success: Teacher notification of first Money Skills topic scheduled sent!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.topicReminderAfter7Days:
                            adminTopicReminderAfter7DaysMutation()
                                .then(() => {
                                    callSnackbar('Success: Parent topic reminder after 7 days sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.updateNoLinkedParentStatusOfPupils:
                            updateNoLinkedParentStatusOfPupilsMutation()
                                .then(() => {
                                    callSnackbar('Success: Updated status of pupils with no linked parents successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendTrophyMailToPupil:
                            adminSendTrophyMailToPupilMutation()
                                .then(() => {
                                    callSnackbar('Success: Pupil achievement mail sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendTrophyMailToTeacher:
                            adminSendTrophyMailToTeacherMutation()
                                .then(() => {
                                    callSnackbar('Success: Teacher achievement mail sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.updateAllGroupAcrossClassesLicenseDetails:
                            updateAllGroupAcrossClassesLicenseDetailsForCronJobSelectMutation()
                                .then(() => {
                                    callSnackbar('Success: Updated all group across classes license details successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendTrophyMailToSchoolLeader:
                            adminSendTrophyMailToSchoolLeaderMutation()
                                .then(() => {
                                    callSnackbar('Success: School leader achievement mail sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.logsCleanUp:
                            adminlogsCleanUpMutation()
                                .then(() => {
                                    callSnackbar('Success: Cleaned old logs successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.createReadingTopics:
                            adminCreateReadingTopicsMutation()
                                .then(() => {
                                    callSnackbar('Success: Created reading topics for classes successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.refreshAllAdminQueries:
                            refreshAllAdminQueriesMutation()
                                .then(() => {
                                    callSnackbar('Success: Admin queries refreshed successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.readingTopicReminders:
                            readingTopicRemindersMutation()
                                .then(() => {
                                    callSnackbar('Success: Mail for reading topic reminder for 2 and 5 days sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendTeacherReadingTopicEnd:
                            sendTeacherReadingTopicEndMutation()
                                .then(() => {
                                    callSnackbar('Success: Mail for teacher reading topic ended sent successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.runHourlySqlQueries:
                            runHourlySqlQueriesMutation()
                                .then(() => {
                                    callSnackbar('Success: Hourly sql queries ran successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.runNightlySqlQueries:
                            runNightlySqlQueriesMutation()
                                .then(() => {
                                    callSnackbar('Success: Nightly sql queries ran successfully!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendAllPendingNotifications:
                            sendAllPendingNotificationsForCronJobSelectMutation()
                                .then(() => {
                                    callSnackbar('Success: Sent pending notifications!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.reimportSchoolsWonde:
                            reimportSchoolsWondeMutation()
                                .then(() => {
                                    callSnackbar('Success: Wonde reimporting for schools started!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.updateAllInterstitialFormsContextMutation:
                            updateAllInterstitialFormsContextMutation()
                                .then(() => {
                                    callSnackbar('Success: Site forms context updated!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendParentNotificationOfTeacherReadingComment:
                            sendParentNotificationOfTeacherReadingCommentForCronJobSelectMutation()
                                .then(() => {
                                    callSnackbar('Success: Parents notified for teacher reading log comment!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.sendParentNotificationOfTeacherFeedbackReply:
                            sendParentNotificationOfTeacherFeedbackReplyForCronJobSelectMutation()
                                .then(() => {
                                    callSnackbar('Success: Parents notified for teacher reading log comment!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        case CronJobOptions.updateRegionInSchoolFromWondeData:
                            updateRegionInSchoolFromWondeDataMutation()
                                .then(() => {
                                    callSnackbar('Success: Region in school updated from Wonde data!', 'success');
                                })
                                .catch(({ ...err }) => callSnackbar(err, 'error'));
                            break;

                        default:
                            break;
                    }
                }}>
                {({ values, handleChange, handleSubmit, handleBlur, errors, touched }) => (
                    <Form className="text-fields" onSubmit={(e) => e.preventDefault()}>
                        <CommonSelectField
                            label="Cron Job"
                            options={sharedJson?.cron_job_options}
                            value={values.cronJob}
                            error={errors.cronJob}
                            touched={touched.cronJob}
                            md={12}
                            lg={12}
                            onChange={(e) =>
                                handleChange({
                                    target: { name: 'cronJob', value: e.target.value }
                                })
                            }
                            onBlur={(e) =>
                                handleBlur({
                                    target: { name: 'cronJob', value: e.target.value }
                                })
                            }
                            dataTest="cron-job-select-field"
                        />

                        <div>
                            <LWPButton
                                btnText={'Run Cron Job'}
                                onClick={handleSubmit}
                                loading={
                                    trophiesAssignedToPupilsLoading ||
                                    adminSendReleasedPupilTopicNotificationsLoading ||
                                    adminTeacherTopicsToBeReleasedTomorrowLoading ||
                                    adminTeacherTopicsToBeReleasedNextWeekLoading ||
                                    adminTeacherMoneySkillsFirstTopicScheduledLoading ||
                                    updateNoLinkedParentStatusOfPupilsLoading ||
                                    runHourlySqlQueriesLoading ||
                                    runNightlySqlQueriesLoading ||
                                    sendAllPendingNotificationsForCronJobSelectLoading ||
                                    adminTopicReminderAfter7DaysLoading ||
                                    adminSendTrophyMailToPupilLoading ||
                                    adminSendTrophyMailToTeacherLoading ||
                                    adminSendTrophyMailToSchoolLeaderLoading ||
                                    adminlogsCleanUpLoading ||
                                    adminCreateReadingTopicsLoading ||
                                    refreshAllAdminQueriesLoading ||
                                    reimportSchoolsWondeLoading ||
                                    readingTopicRemindersLoading ||
                                    updateAllInterstitialFormsContextLoading ||
                                    sendParentNotificationOfTeacherReadingCommentForCronJobSelectLoading ||
                                    sendParentNotificationOfTeacherFeedbackReplyForCronJobSelectLoading ||
                                    sendTeacherReadingTopicEndLoading ||
                                    updateAllGroupAcrossClassesLicenseDetailsForCronJobSelectLoading ||
                                    updateRegionInSchoolFromWondeDataLoading
                                }
                            />
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

export default CronJobSelect;
