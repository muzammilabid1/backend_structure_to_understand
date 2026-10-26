export enum UseEmailOption {
    LAYOUT = 'LAYOUT',
    HTML = 'HTML'
}

export enum EmailTemplateTypes {
    deprecatedTemplate = 'deprecatedTemplate',
    adminInvitationEmail = 'adminInvitationEmail',
    parentInvitationEmail = 'parentInvitationEmail',
    userRequestedSignUpLink = 'userRequestedSignUpLink',
    schoolLeaderInvitationEmail = 'schoolLeaderInvitationEmail',
    sendMailForTopicReminderAfter7Days = 'sendMailForTopicReminderAfter7Days',
    sendPupilTopics = 'sendPupilTopics',
    updatedMagicLink = 'updatedMagicLink',
    invoiceOfSchoolClassLicenceToAdmin = 'invoiceOfSchoolClassLicenceToAdmin',
    invoiceOfSchoolClassLicenceToSchool = 'invoiceOfSchoolClassLicenceToSchool',
    sendQuestionToLwpStaff = 'sendQuestionToLwpStaff',
    sendQuestionToUser = 'sendQuestionToUser',
    sendResetPasswordEmail = 'sendResetPasswordEmail',
    sendTeacherAssignedToClass = 'sendTeacherAssignedToClass',
    sendTeacherTopicsToBeReleasedTomorrow = 'sendTeacherTopicsToBeReleasedTomorrow',
    sendTeacherReadingTopicEnd = 'sendTeacherReadingTopicEnd',
    teacherInvitationEmail = 'teacherInvitationEmail',
    sendTrophyMailToParent = 'sendTrophyMailToParent',
    sendTrophyMailToTeacher = 'sendTrophyMailToTeacher',
    sendPupilReadingTopicReleased = 'sendPupilReadingTopicReleased',
    readingTopicReminderAfter2Days = 'readingTopicReminderAfter2Days',
    readingTopicReminderAfter5Days = 'readingTopicReminderAfter5Days',
    sendParentNotificationOfTeacherReadingComment = 'sendParentNotificationOfTeacherReadingComment',
    sendParentNotificationOfTeacherFeedbackReply = 'sendParentNotificationOfTeacherFeedbackReply',
    sendTeacherReadingTopicHolidayOverlap = 'sendTeacherReadingTopicHolidayOverlap',
    sendLwpTeamMoneySkillsActivationEmail = 'sendLwpTeamMoneySkillsActivationEmail',
    schoolLeaderWelcomeEmail = 'schoolLeaderWelcomeEmail',
    sendTeacherTopicToBeReleasedNextWeek = 'sendTeacherTopicToBeReleasedNextWeek',
    sendTeacherMoneySkillsFirstTopicScheduled = 'sendTeacherMoneySkillsFirstTopicScheduled'
}

export enum EmailTemplateStatus {
    CURRENT = 'CURRENT',
    DRAFT = 'DRAFT',
    HISTORIC = 'HISTORIC'
}

export interface IAddEmailTemplateInput {
    id?: string;
    type?: EmailTemplateTypes;
    schoolId?: number;
    sendEmail?: boolean;
    emailOption?: UseEmailOption;
    subject?: string;
    previewLine?: string;
    senderName?: string;
    senderEmail?: string;
    heading?: string;
    bodyText?: string;
    linkText?: string;
    link?: string;
    wholeEmailContent?: string;
    multipleSection?: boolean;
    multipleSectionContent?: string;
    sendSms?: boolean;
    smsContent?: string;
    sendPhoneNotification?: boolean;
    notificationTitle?: string;
    notificationDescription?: string;
    notificationUrl?: string;
    status?: EmailTemplateStatus;
}
