import { constants, ReadingMode, SchoolAnalyticsGraphType, SchoolImpactReportType, validations } from 'lwp-shared';

export const TEACHER = 'TEACHER';
export const SCHOOL = 'SCHOOL';
export const PARENT = 'PARENT';
export const HELPER = 'HELPER';
export const TOPICACCESS = 'TOPICACCESS';
export const MAGICPARENT = 'MAGICPARENT';
export const ADMIN = 'ADMIN';
export const GROUP = 'GROUP';
export const READING = 'READING';
export const SCRAPBOOK = 'SCRAPBOOK';
export const PUPIL = 'PUPIL';
export const BOTH = 'BOTH';
export const CLASS = 'CLASS';
export const TOPIC = 'TOPIC';
export const SCHOOLLEADER = 'SCHOOLLEADER';

export const PAGINATION_ITEM_LIMIT = 5;

export const MINIO_PUBLIC_PATHS = {
    PUPILGENERATEDMATHSCOTS: 'generated/img/mathscots',
    PUPILMATHSCOTS: 'static/img/mathscots',
    SITEIMAGE: 'static/img/site',
    DEFAULTPAGEANNOUNCEMENTICONS: 'upload/photos/page_announcement_icons/default',
    PUPILMATHSCOTCOLORS: 'static/img/mathscots/colors',
    PUPILMATHSCOTICONS: 'static/img/mathscots/icons'
};

export const DEFAULT_PARENT_WITH_CHILD_MATHSCOT = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/parent-child-high-five.png`;
export const DEFAULT_MWP_TEACHER_MATHSCOT = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/teacher-img.png`;
export const DEFAULT_LWP_TEACHER_MATHSCOT = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/lwp_teacher.png`;
export const DEFAULT_CHILD_IMAGE = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot.png`;
export const TV_IMAGE = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/tv.png`;
export const DEFAULT_EMPTY_IMAGE = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/question-mark-new.png`;
export const DEFAULT_READING_EMPTY_IMAGE = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/question.svg`;
// export const HOME_ICON = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/homeIcon.svg`;
export const DEFAULT_CHILD_IMAGE_WITH_RED_SHIRT = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/child-mathscot-red-shirt.png`;
export const DEFAULT_READING_IMAGE = `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL}/${MINIO_PUBLIC_PATHS.SITEIMAGE}/Book_Open_Purple.png`;

export const onlyNumberRegex = /^[0-9]+$/;
export const phoneRegex = validations.user.phoneRegex;
export const emailRegex = validations.user.emailRegex;

export const isNumber = /\+|[0-9]{2}/;

export const fileNameRE = /^[a-zA-Z0-9_-]*$/;

export const adminPath = '/admin';
export const readingAsASubjectId = constants.readingAsASubjectId;
export const readingAsASubjectName = constants.readingAsASubjectName;
export const cypressLoginCode = 'CYPRESS_SOCIAL_LOGIN_CODE';

export const characters = ['Dog', 'Meerkat', 'Owl', 'Cat', 'Parrot', 'Rabbit', 'Monkey', 'Koala', 'Penguin', 'Panda'];
export const colours = ['Natural', 'Purple', 'Green'];

// CommonSelectField renders `value` as the option label and submits `key`.
export const teacherRole = [
    {
        key: 'CLASS_TEACHER',
        value: 'Class teacher'
    },
    {
        key: 'SCHOOL_LEADER',
        value: 'School leader'
    }
];

export const unexpectedError = {
    message: 'Unexpected error. Please refresh the page and try again.',
    networkError: { statusCode: 535 }
};

export const formIncompleteWarning = 'Some information in your entry is missing or incorrect. Please check your entry and try again.';

export const STATUS_CODES = {
    _403: 403,
    _538: 538,
    _537: 537,
    _536: 536,
    _535: 535,
    _539: 539,
    _540: 540,
    INVALID_MAGIC_LINK: 540,
    ACCOUNT_NOT_ACTIVE: 541,
    FAILED_EMAIL: 542,
    EXPIRED_MAGIC_LINK: 543,
    SOCIAL_ACCOUNT_NOT_FOUND: 544,
    SOCIAL_ACCOUNT_NOT_LINKED: 545,
    CANNOT_LINK_SOCIAL_ACCOUNT: 546,
    WRONG_SOCIAL_ACCOUNT: 547
};

export const SchoolClassStatus = {
    ACTIVE: 'ACTIVE',
    IMPORTED: 'IMPORTED',
    HIDDEN: 'HIDDEN',
    INACTIVE: 'INACTIVE'
};

export const TagsCategoryType = {
    Topics: 'TOPIC_TAG',
    Schools: 'SCHOOL_TAG',
    Activities: 'ACTIVITY_TAG',
    Pupil: 'PUPIL_TAG'
};

export const PupilType = {
    BOTH: 'BOTH',
    TOPIC: 'TOPIC',
    READING: 'READING'
};

export const UserAssociatedLoginType = {
    MICROSOFT: 'MICROSOFT',
    GOOGLE: 'GOOGLE',
    PASSWORD: 'PASSWORD',
    FACEBOOK: 'FACEBOOK'
};

export const SocialLoginType = {
    microsoft: 'microsoft',
    google: 'google'
};

export const MAGIC_LINK_TYPES = {
    RESETPASSWORD: 'RESETPASSWORD',
    INVITATION: 'INVITATION',
    REJECT_INVITATION: 'REJECT_INVITATION',
    TOPICACCESS: 'TOPICACCESS',
    TROPHY: 'TROPHY',
    SCHOOL_IMPACT_REPORT: 'SCHOOL_IMPACT_REPORT',
    READING: 'READING'
};

export const notificationPreferenceEnum = {
    EMAILREMINDER: 'EMAILREMINDER',
    SMSREMINDER: 'SMSREMINDER',
    BOTH: 'BOTH',
    NOREMINDER: 'NOREMINDER'
};

export const photoPermissionsContent = {
    firstPermission:
        "I understand these comments and photos will be shared with my child's school or educational organisation, where it may be shared internally in accordance with their policies. Learning with Parents will store these in line with the terms of their",
    secondPermission:
        "I give permission for Learning with Parents and my child's school or educational organisation to use my comments and photos in marketing materials and on other social media. In all cases we will never disclose your name or contact details when we use the comments/photos."
};

export const PupilMathscotsCharacter = {
    MONKEY: 'Monkey',
    PANDA: 'Panda',
    KOALA: 'Koala',
    PENGUIN: 'Penguin',
    DOG: 'Dog',
    MEERKAT: 'Meerkat',
    OWL: 'Owl',
    CAT: 'Cat',
    PARROT: 'Parrot',
    RABBIT: 'Rabbit'
};

export const PupilMathscotsColour = {
    NATURAL: 'Natural',
    PURPLE: 'Purple',
    GREEN: 'Green'
};

export const PupilStatus = {
    ACTIVE: 'ACTIVE',
    MISSING: 'MISSING',
    REGISTERED: 'REGISTERED'
};

export const TestEmailType = {
    adminInvitationEmail: 'adminInvitationEmail',
    parentInvitationEmail: 'parentInvitationEmail',
    schoolLeaderInvitationEmail: 'schoolLeaderInvitationEmail',
    sendMailForAllPupilSignUp: 'sendMailForAllPupilSignUp',
    sendMailForOneThirdPupilSignUp: 'sendMailForOneThirdPupilSignUp',
    sendMailForTwoThirdPupilSignUp: 'sendMailForTwoThirdPupilSignUp',
    sendMailForTopicReminderAfter7Days: 'sendMailForTopicReminderAfter7Days',
    sendParentWelcomeMail: 'sendParentWelcomeMail',
    sendPupilTopics: 'sendPupilTopics',
    sendQuestionToLwpStaff: 'sendQuestionToLwpStaff',
    sendQuestionToUser: 'sendQuestionToUser',
    sendResetPasswordEmail: 'sendResetPasswordEmail',
    sendTeacherAssignedToClass: 'sendTeacherAssignedToClass',
    sendTeacherTopicsToBeReleasedTomorrow: 'sendTeacherTopicsToBeReleasedTomorrow',
    sendTeacherWelcomeMail: 'sendTeacherWelcomeMail',
    teacherInvitationEmail: 'teacherInvitationEmail',
    sendTrophyMailToParent: 'sendTrophyMailToParent',
    sendTrophyMailToTeacher: 'sendTrophyMailToTeacher  '
};

export const CronJobOptions = {
    sendReleasedPupilTopicNotifications: 'sendReleasedPupilTopicNotifications',
    teacherTopicsToBeReleasedTomorrow: 'teacherTopicsToBeReleasedTomorrow',
    teacherTopicsToBeReleasedNextWeek: 'teacherTopicsToBeReleasedNextWeek',
    teacherMoneySkillsFirstTopicScheduled: 'teacherMoneySkillsFirstTopicScheduled',
    topicReminderAfter7Days: 'topicReminderAfter7Days',
    updateNoLinkedParentStatusOfPupils: 'updateNoLinkedParentStatusOfPupils',
    sendTrophyMailToPupil: 'sendTrophyMailToPupil',
    sendTrophyMailToTeacher: 'sendTrophyMailToTeacher',
    sendTrophyMailToSchoolLeader: 'sendTrophyMailToSchoolLeader',
    logsCleanUp: 'logsCleanUp',
    updateAllGroupAcrossClassesLicenseDetails: 'updateAllGroupAcrossClassesLicenseDetails',
    createReadingTopics: 'createReadingTopics',
    trophiesAssignedToPupils: 'trophiesAssignedToPupils',
    refreshAllAdminQueries: 'refreshAllAdminQueries',
    readingTopicReminders: 'readingTopicReminders',
    sendTeacherReadingTopicEnd: 'sendTeacherReadingTopicEnd',
    reimportSchoolsWonde: 'reimportSchoolsWonde',
    runHourlySqlQueries: 'runHourlySqlQueries',
    runNightlySqlQueries: 'runNightlySqlQueries',
    updateAllInterstitialFormsContextMutation: 'updateAllInterstitialFormsContextMutation',
    sendAllPendingNotifications: 'sendAllPendingNotifications',
    sendParentNotificationOfTeacherReadingComment: 'sendParentNotificationOfTeacherReadingComment',
    sendParentNotificationOfTeacherFeedbackReply: 'sendParentNotificationOfTeacherFeedbackReply',
    updateRegionInSchoolFromWondeData: 'updateRegionInSchoolFromWondeData'
};

export const TestEmailTypeOptions = [
    { key: 'adminInvitationEmail', value: 'Admin Invitation Email' },
    { key: 'parentInvitationEmail', value: 'Parent Invitation Email' },
    { key: 'userRequestedSignUpLink', value: 'User Requested Signup Link Email' },
    { key: 'schoolLeaderInvitationEmail', value: 'School Leader Invitation Email' },
    { key: 'sendMailForAllPupilSignUp', value: 'Email For All Pupil SignUp' },
    { key: 'sendMailForOneThirdPupilSignUp', value: 'Email For One Third Pupil SignUp' },
    { key: 'sendMailForTwoThirdPupilSignUp', value: 'Email For Two Third SignUp' },
    {
        key: 'sendMailForTopicReminderAfter7Days',
        value: 'Send Mail For Topic Reminder After 7 Days'
    },
    { key: 'sendParentWelcomeMail', value: 'Send Parent Welcome Mail' },
    { key: 'sendPupilTopics', value: 'Send Pupil Topics' },
    { key: 'sendQuestionToLwpStaff', value: 'Send Question To LWP Staff' },
    { key: 'sendQuestionToUser', value: 'Send Question To User' },
    { key: 'sendResetPasswordEmail', value: 'Send Reset Password Email' },
    { key: 'sendTeacherAssignedToClass', value: 'Send Teacher Assigned To Class' },
    {
        value: 'Send Teacher Topics To Be Released Tomorrow',
        key: 'sendTeacherTopicsToBeReleasedTomorrow'
    },
    {
        value: 'Send Teacher Topic To Be Released Next Week',
        key: 'sendTeacherTopicToBeReleasedNextWeek'
    },
    {
        value: 'Send Teacher Reading Topic Ended Notification',
        key: 'sendTeacherReadingTopicEnd'
    },
    {
        value: 'Send Parent Reading Topic Release',
        key: 'sendPupilReadingTopicReleased'
    },
    {
        value: 'Send Mail For Reading Topic Reminder After 2 Days',
        key: 'readingTopicReminderAfter2Days'
    },
    {
        value: 'Send Mail For Reading Topic Reminder After 5 Days',
        key: 'readingTopicReminderAfter5Days'
    },
    { key: 'sendTeacherWelcomeMail', value: 'Send Teacher Welcome Mail' },
    { key: 'teacherInvitationEmail', value: 'Teacher Invitation Email' },
    { key: 'sendTrophyMailToParent', value: 'Send Trophy Mail To Parent' },
    { key: 'sendTrophyMailToTeacher', value: 'Send Trophy Mail To Teacher' },
    { key: 'updatedMagicLink', value: 'Updated Magic Link' },
    { key: 'deprecatedTemplate', value: 'Deprecated Template' },
    { key: 'sendParentNotificationOfTeacherReadingComment', value: 'Send parent notification of teacher reading log comment' },
    { key: 'sendParentNotificationOfTeacherFeedbackReply', value: 'Send parent notification of teacher feedback reply' },
    { key: 'sendTeacherReadingTopicHolidayOverlap', value: 'Send teacher reading topic holiday overlap' },
    { key: 'invoiceOfSchoolClassLicenceToAdmin', value: 'Send school class licence invoice to admin' },
    { key: 'invoiceOfSchoolClassLicenceToSchool', value: 'Send school class licence invoice to school' },
    { key: 'sendLwpTeamMoneySkillsActivationEmail', value: 'Send LWP Team Money Skills Activation Email' },
    { key: 'sendTeacherMoneySkillsFirstTopicScheduled', value: 'Send Teacher Money Skills First Topic Scheduled' }
];

export const sendRegistrationMail = ['BASEURL', 'USERSTATUS', 'FIRSTNAME', 'LASTNAME', 'TEACHERALIAS', 'CLASS', 'SCHOOL', 'REGISTEREDLIST'];

export const notificationEmailParameters = {
    sendTrophyMailToParent: {
        always: ['MAGICID', 'PUPILID', 'TROPHYNAME', 'CHILDFIRSTNAME', 'CHILDLASTNAME'],
        conditional: []
    },
    sendTrophyMailToTeacher: {
        always: ['BASEURL', 'CLASSID', 'TROPHYNAME', 'MESSAGE'],
        conditional: ['CLASS']
    },
    sendPupilTopics: {
        always: [
            'MAGICID',
            'PUPILID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE',
            'PARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTSTATUS',
            'PENDINGTOPICS'
        ],
        conditional: [
            'SCHOOL',
            'TOPICNAME',
            'TEACHERALIAS',
            'DUEDATE',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT',
            'REJECT_MAGICID',
            'NEW_STICKERS',
            'SCRAPBOOKPROMPT',
            'SUBJECTNAME'
        ]
    },

    sendPupilReadingTopicReleased: {
        always: [
            'MAGICID',
            'PUPILID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE',
            'TARGET',
            'PARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTSTATUS'
        ],
        conditional: [
            'SCHOOL',
            'TOPICNAME',
            'TEACHERALIAS',
            'DUEDATE',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT',
            'REJECT_MAGICID',
            'NEW_STICKERS',
            'SUBJECTNAME'
        ]
    },

    updatedMagicLink: {
        always: [
            'BASEURL',
            'MAGICID',
            'PUPILID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE',
            'PARENTSTATUS',
            'PUPILSTATUS',
            'PUPILPARENTSTATUS',
            'TARGET_URL'
        ],
        conditional: [
            'SCHOOL',
            'TOPICNAME',
            'TEACHERALIAS',
            'DUEDATE',
            'PUPILPARENTINVITATIONAT',
            'PARENTINVITATIONAT',
            'REJECT_MAGICID',
            'TARGET'
        ]
    },
    sendTeacherTopicsToBeReleasedTomorrow: {
        always: [
            'SCHOOL',
            'TOPICNAME',
            'CLASS',
            'TEACHERALIAS',
            'RELEASEDATE',
            'ISRELEASED',
            'TEACHERPDF_FILENAME',
            'PARENTTOPICNAME',
            'CLASSID'
        ],
        conditional: ['DUEDATE', 'TOPICMESSAGE']
    },
    sendTeacherTopicToBeReleasedNextWeek: {
        always: [
            'SCHOOL',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TOPICNAME',
            'PARENTTOPICNAME',
            'TEACHERALIAS',
            'RELEASEDATE',
            'TEACHERRESOURCE_FILENAME'
        ],
        conditional: ['DUEDATE', 'TOPICMESSAGE', 'TEACHERPDF_FILENAME']
    },
    sendTeacherMoneySkillsFirstTopicScheduled: {
        always: [
            'SCHOOL',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'TOPICNAME',
            'PARENTTOPICNAME',
            'TEACHERALIAS',
            'RELEASEDATE',
            'PUBLICFILES_BASEURL',
            'TEACHERPDF_REQUIRED',
            'ISSCHOOLLEADER',
            'ISMAINTEACHER'
        ],
        conditional: ['DUEDATE', 'TEACHERRESOURCE_FILENAME', 'TEACHERPDF_FILENAME']
    },
    sendTeacherReadingTopicEnd: {
        always: ['TOPICNAME', 'PARENTTOPICNAME', 'TEACHERALIAS', 'CLASS', 'RELEASEDATE', 'ISRELEASED', 'TARGET', 'CLASSID', 'DUEDATE'],

        conditional: []
    },
    sendRegistrationMail: {
        always: ['BASEURL', 'USERSTATUS', 'FIRSTNAME', 'LASTNAME', 'TEACHERALIAS', 'CLASS', 'SCHOOL', 'REGISTEREDLIST'],
        conditional: []
    },
    sendMailForTopicReminderAfter7Days: {
        always: [
            'PUPILID',
            'MAGICID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE'
        ],
        conditional: ['SCHOOL', 'TOPICNAME', 'TEACHERALIAS', 'DUEDATE']
    },
    readingTopicReminderAfter5Days: {
        always: [
            'PUPILID',
            'MAGICID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE'
        ],
        conditional: ['SCHOOL', 'TOPICNAME', 'TEACHERALIAS', 'DUEDATE']
    },
    readingTopicReminderAfter7Days: {
        always: [
            'BASEURL',
            'USERSTATUS',
            'FIRSTNAME',
            'LASTNAME',
            'PUPILID',
            'PUPILTOPICID',
            'CLASSID',
            'CLASSTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'SCHOOL',
            'TOPICNAME',
            'TOPICSUBJECT',
            'TOPICMESSAGE',
            'CLASS',
            'TEACHERALIAS',
            'TEACHERMESSAGE',
            'RELEASEDATE',
            'DUEDATE',
            'READABLEDATE',
            'PENDINGTOPICS'
        ],
        conditional: []
    },
    readingTopicReminderAfter2Days: {
        always: [
            'PUPILID',
            'MAGICID',
            'PUPILTOPICID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'CLASSID',
            'CLASSTOPICID',
            'RELEASEDATE'
        ],
        conditional: ['SCHOOL', 'TOPICNAME', 'TEACHERALIAS', 'DUEDATE']
    },
    sendQuestionToUser: {
        always: ['BASEURL', 'USERQUESTION'],
        conditional: []
    },
    sendQuestionToLwpStaff: {
        always: ['BASEURL', 'USERQUESTION', 'USERFIRSTNAME', 'USERLASTNAME', 'USERTYPE'],
        conditional: ['SCHOOL']
    },
    schoolLeaderInvitationEmail: {
        always: ['BASEURL', 'INVITEDBY', 'SCHOOL', 'MAGICID', 'REJECT_MAGICID', 'TOTALLICENSES', 'FULLPROGRAMMELICENSES'],
        conditional: []
    },
    schoolLeaderWelcomeEmail: {
        always: ['BASEURL', 'SCHOOL', 'SPM', 'ACADEMICYEAR'],
        conditional: ['WONDECOMPLETED', 'FULLPROGRAMME', 'READINGLOG', 'READINGLOGONLY', 'READYTEDDY', 'SCHOOLTAGS', 'SPMEMAIL']
    },
    adminInvitationEmail: {
        always: ['BASEURL', 'MAGICID', 'REJECT_MAGICID'],
        conditional: ['INVITEDBY']
    },
    teacherInvitationEmail: {
        always: ['BASEURL', 'INVITEDBY', 'CODE', 'SCHOOL', 'MAGICID', 'REJECT_MAGICID', 'READINGLOGCLASSES', 'FULLPROGRAMMECLASSES'],
        conditional: []
    },
    parentInvitationEmail: {
        always: ['BASEURL', 'CODE', 'MAGICID', 'REJECT_MAGICID'],
        conditional: []
    },
    userRequestedSignUpLink: {
        always: ['CODE', 'BASEURL', 'MAGICID', 'FIRSTNAME', 'USERSTATUS', 'REJECT_MAGICID', 'RESETPASSTOKEN'],
        conditional: []
    },
    sendResetPasswordEmail: {
        always: ['BASEURL', 'MAGICID', 'USERSTATUS'],
        conditional: []
    },
    sendTeacherAssignedToClass: {
        always: ['BASEURL', 'CLASS', 'SCHOOL', 'TEACHERALIAS', 'CLASSID', 'ISFULLPROGRAMMECLASS'],
        conditional: []
    },
    sendParentNotificationOfTeacherReadingComment: {
        always: [
            'PUPILID',
            'CLASSTOPICID',
            'PUPILTOPICID',
            'CLASSID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'CLASS',
            'RELEASEDATE',
            'READINGENTRYDATE',
            'COMMENT',
            'MAGICID'
        ],
        conditional: ['SCHOOL', 'TEACHERALIAS']
    },
    sendParentNotificationOfTeacherFeedbackReply: {
        always: [
            'FIRSTNAME',
            'LASTNAME',
            'BASEURL',
            'USERSTATUS',
            'REPLY',
            'PUPILID',
            'PUPILFEEDBACKID',
            'CHILDFIRSTNAME',
            'CHILDLASTNAME',
            'FIRSTNAME',
            'LASTNAME',
            'TEACHERALIAS',
            'ISREADING',
            'TOPICNAME',
            'ACTIVITYNAME'
        ],
        conditional: []
    },
    sendTeacherReadingTopicHolidayOverlap: {
        always: [
            'SCHOOL',
            'CLASS',
            'TEACHERALIAS',
            'CLASSTOPICID',
            'RELEASEDATE',
            'CLASSID',
            'HOLIDAYNAME',
            'HOLIDAYSTARTDATE',
            'HOLIDAYENDDATE',
            'BASEURL',
            'TEACHERALIAS'
        ],
        conditional: []
    },
    invoiceOfSchoolClassLicenceToAdmin: {
        always: [
            'EMAIL',
            'ADDITIONALFULLPROGRAMMECLASSCOUNT',
            'ADDITIONALREADINGONLYCLASSCOUNT',
            'ADDITIONALUPGRADECLASSCOUNT',
            'ADDITIONALFULLPROGRAMMECLASSPRICE',
            'ADDITIONALREADINGONLYCLASSPRICE',
            'ADDITIONALUPGRADECLASSPRICE',
            'ADDITIONALREADYTEDDYCLASSCOUNT',
            'ADDITIONALREADYTEDDYCLASSPRICE',
            'TOTALPRICE',
            'SCHOOLID',
            'SCHOOLNAME',
            'USEREMAIL',
            'USERID',
            'USERFIRSTNAME',
            'USERLASTNAME',
            'USERALIAS',
            'ADDITIONALEMAILS'
        ],
        conditional: []
    },
    invoiceOfSchoolClassLicenceToSchool: {
        always: [
            'FIRSTNAME',
            'LASTNAME',
            'EMAIL',
            'ADDITIONALFULLPROGRAMMECLASSCOUNT',
            'ADDITIONALREADINGONLYCLASSCOUNT',
            'ADDITIONALUPGRADECLASSCOUNT',
            'ADDITIONALFULLPROGRAMMECLASSPRICE',
            'ADDITIONALREADINGONLYCLASSPRICE',
            'ADDITIONALUPGRADECLASSPRICE',
            'ADDITIONALREADYTEDDYCLASSCOUNT',
            'ADDITIONALREADYTEDDYCLASSPRICE',
            'TOTALPRICE',
            'SCHOOLID',
            'SCHOOLNAME',
            'USEREMAIL',
            'USERID',
            'USERFIRSTNAME',
            'USERLASTNAME',
            'USERALIAS'
        ],
        conditional: []
    },
    sendLwpTeamMoneySkillsActivationEmail: {
        always: ['BASEURL', 'SCHOOLID', 'SCHOOLNAME', 'ENABLED_AT', 'FIRSTNAME', 'LASTNAME', 'EMAIL'],
        conditional: ['TEACHERALIAS']
    }
};

export const EmailTemplateStatus = {
    CURRENT: 'CURRENT',
    DRAFT: 'DRAFT',
    HISTORIC: 'HISTORIC'
};

export const classReadingProgress = {
    NOT_SET: 'NOT_SET',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED'
};

export const renderReadingTypeImg = {
    SCHOOL_BOOK: 'new-school-book',
    OWN_BOOK: 'new-own-book',
    SOMETHING_ELSE: 'new-something-else'
};

/**
 * The only description of a way of reading. The card, the tooltip definition and the history verb
 * are worded differently on purpose, and keeping them in one row is what Constant.test.ts checks.
 * Illustration sizes and offsets are the design's; the assets are 2x those dimensions.
 */
export const readingModes = [
    {
        value: ReadingMode.READ_INDEPENDENTLY,
        cardLabel: 'Read independently',
        historyPhrase: 'read independently',
        definitionTitle: 'Reading independently',
        definitionBody: 'Including looking through picture books or listening to audiobooks on their own.',
        image: 'read-independently',
        dataTest: 'read-independently-card',
        img: { width: 48, height: 70, top: 3 }
    },
    {
        value: ReadingMode.LISTENED_TOGETHER,
        cardLabel: 'Listened together',
        historyPhrase: 'listened together',
        // "Listened" is the only phrase here that cannot take the book title without a preposition.
        historyObjectLink: 'to',
        definitionTitle: 'Listening together',
        definitionBody: 'Including adults reading or listening to audiobooks together.',
        image: 'listened-together',
        dataTest: 'listened-together-card',
        img: { width: 58, height: 62, top: 7 }
    },
    {
        value: ReadingMode.READ_ALOUD,
        cardLabel: 'Read aloud',
        historyPhrase: 'read aloud',
        definitionTitle: 'Reading aloud',
        definitionBody: 'Including phonics practice sheets or taking it in turns to read a trickier book with an adult.',
        image: 'read-aloud',
        dataTest: 'read-aloud-card',
        img: { width: 63, height: 44, top: 16 }
    },
    {
        value: ReadingMode.READ_IN_REAL_WORLD,
        cardLabel: 'Read in the real world',
        historyPhrase: 'read in the real world',
        definitionTitle: 'Reading in the real world',
        definitionBody: 'Including signs, recipes, instructions, emails or to find out information.',
        image: 'read-in-the-real-world',
        dataTest: 'read-in-the-real-world-card',
        img: { width: 73, height: 58, top: 9 }
    }
];

// Entries logged before this question existed carry no mode and fall back to "read" at the call site.
export const readingModePhrases = Object.fromEntries(readingModes.map((mode) => [mode.value, mode.historyPhrase]));

export const readingModeObjectLinks = Object.fromEntries(readingModes.map((mode) => [mode.value, mode.historyObjectLink ?? '']));

export const readingType = {
    SCHOOL_BOOK: 'SCHOOL_BOOK',
    OWN_BOOK: 'OWN_BOOK',
    SOMETHING_ELSE: 'SOMETHING_ELSE'
};

export const FeedbackType = {
    READING: 'READING',
    ACTIVITY: 'ACTIVITY'
};

export const StickerCharacterItemType = {
    CHARACTER: 'CHARACTER',
    ITEM: 'ITEM'
};

export const themColors = ['#F28D00', '#9BC53D', '#39B0E2', '#887DFF', '#922C52', '#00303C', '#6F60AE', '#C66C00'];

export const IMPACT_REPORT_GRAPH_TITLES = {
    TOPIC_ACTIVITY: {
        engagementByYearGroup: {
            title: 'One topic completion (by year group)',
            description: 'This graph shows the percentage of families who have completed 1 topic per year group.'
        },
        engagementByClass: {
            title: 'One topic completion (by class)',
            description: 'This graph shows the percentage of families who have completed 1 topic per class.'
        },
        avgTopicSetByYearGroup: {
            title: 'Topic setting (by year group)',
            description:
                'We know that engagement has the best chance of improving when topics are set regularly and consistently. This graph shows the number of topics set by each year group since your schools launch.'
        },
        avgTopicSetByClass: {
            title: 'Topic setting (by class)',
            description:
                'We know that engagement has the best chance of improving when topics are set regularly and consistently. This graph shows the number of topics set by each class since your schools launch.'
        },
        buildingEngagement: {
            title: 'Building Engagement',
            description:
                'This graph shows the percentage of pupils who have completed more than one topic across your school. This is a good indication of your building engagement with the programme.'
        }
    },
    READING: {
        engagementByYearGroup: {
            title: 'Weekly target met (by year group)',
            description: 'This graph shows the percentage of pupils who have met the weekly reading target once by year group.'
        },
        engagementByClass: {
            title: 'Weekly target met (by class)',
            description: 'This graph shows the percentage of pupils who have met the weekly reading target once by class.'
        },
        avgWeeklyTargetMetByYearGroup: {
            title: 'Average completion rate (by year group)',
            description:
                'This graph shows the percentage of weekly reading targets that have been met, out of all the individual weekly targets set for each pupil.'
        },
        avgWeeklyTargetMetByClass: {
            title: 'Average completion rate (by class)',
            description:
                'This graph shows the percentage of weekly reading targets that have been met, out of all the individual weekly targets set for each pupil.'
        },
        buildingEngagement: {
            title: 'Building Engagement',
            description:
                'This graph shows the percentage of pupils who have achieved your weekly reading target more than once across your school. This is a good indication of how your school is building engagement with the reading log.'
        }
    }
};

export const IMPACT_REPORT_PROGRAM_OVERVIEW_DESCRIPTION = {
    TOPIC_ACTIVITY: {
        activeFamilyDescription:
            'This is the percentage of families who have watched at least one video or created at least one entry on the site this academic year',
        activePremiumFamilyDescription:
            'This is the percentage of pupil premium families who have watched at least one video or created at least one entry on the site this academic year',
        numberOfWeeksText: 'Number of weeks programme has been running:'
    },
    READING: {
        activeFamilyDescription: 'This is the percentage of pupils who have left a comment or feedback on the site this academic year',
        activePremiumFamilyDescription:
            'This is the percentage of premium pupils who have left a comment or feedback on the site this academic year',
        numberOfWeeksText: 'Number of weeks the log has been live'
    }
};

// The order of "ranges" must strictly follow "['All pupils', 'By year group', 'By class']"
// to ensure alignment with the graph data and labels.
export const SCHOOL_ANALYTICS = [
    {
        title: 'One topic completion',
        subTitle:
            'A key measure is how many of your pupils are engaging with the platform at all. This graph shows the percentage of pupils who have completed at least one topic.',
        type: SchoolImpactReportType.TOPIC_ACTIVITY,
        name: `engagement`,
        yAxisTitle: '% of pupils that have completed at least 1 topic',
        ranges: [
            SchoolAnalyticsGraphType.ENGAGEMENT_BY_SCHOOL,
            SchoolAnalyticsGraphType.ENGAGEMENT_BY_YEAR_GROUP,
            SchoolAnalyticsGraphType.ENGAGEMENT_BY_CLASS
        ],
        dataTest: 't-otc'
    },
    {
        title: 'Topic setting',
        subTitle:
            'We know that engagement has the best chance of improving when topics are set regularly and consistently. This graph shows the number of topics set by each class since your school’s launch.',
        type: SchoolImpactReportType.TOPIC_ACTIVITY,
        name: `topic-setting`,
        yAxisTitle: 'Number of topics set (average per pupil)',
        ranges: [
            SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_SCHOOL,
            SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_YEAR_GROUP,
            SchoolAnalyticsGraphType.AVG_TOPIC_SET_BY_CLASS
        ],
        dataTest: 't-ts'
    },
    {
        title: 'Average topic completion rate',
        subTitle: 'This graph shows the percentage of topics that have been completed, out of all the topics set for each pupil.',
        type: SchoolImpactReportType.TOPIC_ACTIVITY,
        name: `avg-topic-completion-rate`,
        yAxisTitle: 'Percentage of topics completed (average)',
        ranges: [
            SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_SCHOOL,
            SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_YEAR_GROUP,
            SchoolAnalyticsGraphType.AVG_TOPIC_COMPLETION_BY_CLASS
        ],
        dataTest: 't-atcr'
    },
    {
        title: 'Building engagement - topics & activities',
        subTitle:
            'This graph shows the percentage of pupils who have completed more than one topic across your school. This is a good indication of your building engagement with the programme.',
        type: SchoolImpactReportType.TOPIC_ACTIVITY,
        name: `building-engagement`,
        ranges: [SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT],
        dataTest: 't-be'
    },
    {
        title: 'One weekly reading target met',
        subTitle:
            'This graph shows the percentage of pupils who have met the weekly reading target at least once. Our data shows that the greatest hurdle is encouraging families to begin their engagement.',
        type: SchoolImpactReportType.READING,
        name: `engagement`,
        yAxisTitle: 'Pupils reaching reading target at least 1',
        ranges: [
            SchoolAnalyticsGraphType.ENGAGEMENT_BY_SCHOOL,
            SchoolAnalyticsGraphType.ENGAGEMENT_BY_YEAR_GROUP,
            SchoolAnalyticsGraphType.ENGAGEMENT_BY_CLASS
        ],
        dataTest: 'r-owrtm'
    },
    {
        title: 'Average reading completion rate',
        subTitle:
            'This graph shows the percentage of weekly reading targets that have been met, out of all the individual weekly targets set for each pupil.',
        type: SchoolImpactReportType.READING,
        name: `avg-reading-completion-rate`,
        yAxisTitle: 'Weekly targets met (average)',
        ranges: [
            SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_SCHOOL,
            SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_YEAR_GROUP,
            SchoolAnalyticsGraphType.AVG_WEEKLY_TARGET_MET_BY_CLASS
        ],
        dataTest: 'r-arcr'
    },
    {
        title: 'Building engagement - reading',
        subTitle:
            'This graph shows the percentage of pupils who have achieved your weekly reading target more than once across your school. This is a good indication of how your school is building engagement with the reading log.',
        type: SchoolImpactReportType.READING,
        name: `building-engagement`,
        ranges: [SchoolAnalyticsGraphType.BUILDING_ENGAGEMENT],
        dataTest: 'r-be'
    }
];

export const PUPILS_NOT_IN_CLASS = {
    CURRENT_YEAR_PUPILS: 'current-year-pupils',
    NEXT_YEAR_PUPILS: 'next-year-pupils'
};

export const ANALYTICS_AND_REPORTS_TABS_TYPE = {
    IMPACT_REPORT: 'impact-reports',
    LIVE_DATA: 'live-data',
    DOWNLOADS: 'downloads'
};

export const IMPACT_REPORT_V2_PROGRAM_OVERVIEW_DESCRIPTION = {
    activeFamilyDescription:
        'This is the percentage of families who have either watched at least one video, created at least one entry on the activity, or logged any reading on the site this academic year.',
    activePremiumFamilyDescription:
        'This is the percentage of pupil premium families who have either watched at least one video, created at least one entry on the activity, or logged any reading on the site this academic year.',
    numberOfWeeksText: 'Number of weeks has been running:'
};

export const IMPACT_REPORT_V2_GRAPHS_INFO = {
    READING: {
        buildingEngagement: {
            title: 'Building Engagement',
            description:
                'This graph shows the percentage of pupils who logged reading at least once in 1, 2, 3, 4, or 5 different reading weeks. This is a good indication of how your school is building engagement with the reading log.',
            xAxisTitle: 'Logged reading at least once on at least _ weeks'
        },
        engagementByYearGroup: {
            title: 'Weekly target met (by year group)',
            description: 'This graph shows the percentage of pupils who have met the weekly reading target once by year group.',
            yAxisTitle: 'Pupils reaching reading target at least 1 week'
        },
        avgCompletionRateByYearGroup: {
            title: 'Average completion rate (by year group)',
            description:
                'This graph shows the percentage of weekly reading targets that have been met, out of all the individual weekly targets set for each pupil.',
            yAxisTitle: 'Weekly targets met (average)'
        },
        avgTopicSetByClass: null
    },
    TOPIC_ACTIVITY: {
        buildingEngagement: {
            title: 'Building Engagement',
            description:
                'This graph shows the percentage of pupils who have completed more than one topic across your school. This is a good indication of your building engagement with the programme.',
            xAxisTitle: 'Completed at least _ topic'
        },
        engagementByYearGroup: {
            title: 'One topic completion (by year group)',
            description: 'This graph shows the percentage of families who have completed 1 topic per year group.',
            yAxisTitle: '% of pupils that have completed at least 1 topic'
        },
        avgCompletionRateByYearGroup: {
            title: 'Completion rate by year group (1 activity per topic)',
            description: 'This graph shows the average topic completion rate per year group.',
            yAxisTitle: 'Pupils averaging 1 activity per topic'
        },
        avgTopicSetByClass: {
            title: 'Topic setting (by class)',
            description:
                'We know that engagement has the best chance of improving when topics are set regularly and consistently. This graph shows the number of topics set by each class since your schools launch.',
            yAxisTitle: 'Number of topics set (average per pupil)'
        }
    }
};

export const ACCESS_TOKEN_COOKIE = constants.ACCESS_TOKEN_COOKIE;
export const REFRESH_TOKEN_COOKIE = constants.REFRESH_TOKEN_COOKIE;
