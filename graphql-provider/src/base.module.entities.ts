import { StaticLwpActivity, StaticLwpActivitySteps } from './api/entities/activity';
import { StaticLwpAdminQuery } from './api/entities/admin_query';
import { LwpClassSequenceAssignment } from './api/entities/class_sequence_assignment';
import { LwpClassTopic } from './api/entities/class_topic';
import { LwpDemoActivityFeedback } from './api/entities/demo_activity_feedback';
import { ImportedContact } from './api/entities/imported_contact';
import { ImportedSchool } from './api/entities/imported_school';
import { ImportedSchoolClass } from './api/entities/imported_school_class';
import { ImportedStudent } from './api/entities/imported_student';
import { ImportedStudentContact } from './api/entities/imported_student_contact';
import { LogLwpLogin } from './api/entities/log_login';
import { LogLwpAccess } from './api/entities/log_lwp_access';
import { LogLwpParentStickerNotification } from './api/entities/log_lwp_parent_sticker_notification';
import { LogLwpPupilClassChange } from './api/entities/log_lwp_pupil_class_change';
import { LogParentPupilAction } from './api/entities/log_parent_pupil_action';
import { LogSchoolClassLicense } from './api/entities/log_school_class_license';
import { LogStaticLwpEmailTemplateHistory } from './api/entities/log_static_lwp_email_template_history';
import { LwpAdminStickerSchoolStatus } from './api/entities/lwp_admin_sticker_school_status';
import { LwpFeedbackReply } from './api/entities/lwp_feedback_reply';
import { LwpNotification } from './api/entities/lwp_notification';
import { LwpNotificationEventHistory } from './api/entities/lwp_notification_event_history';
import { LwpPupilFeedback } from './api/entities/lwp_pupil_feedback';
import { LwpPupilFeedbackEditLog } from './api/entities/lwp_pupil_feedback_edit_log';
import { LwpPupilFeedbackMedia } from './api/entities/lwp_pupil_feedback_media';
import { LwpPupilTag } from './api/entities/lwp_pupil_tag';
import { LwpSchoolDates } from './api/entities/lwp_school_dates';
import { LwpSchoolHoliday } from './api/entities/lwp_school_holiday';
import { LwpSchoolImpactReport } from './api/entities/lwp_school_impact_report';
import { LwpSchoolImpactReportFeedback } from './api/entities/lwp_school_impact_report_feedback';
import { LwpSchoolImpactReportGraphs } from './api/entities/lwp_school_impact_report_graphs';
import { LwpSchoolStaticTags } from './api/entities/lwp_school_static_tags';
import { LwpSetByTeacherStepMedia } from './api/entities/lwp_set_by_teacher_step_media';
import { LwpSticker } from './api/entities/lwp_sticker';
import { LwpStickerCharacterItem } from './api/entities/lwp_sticker_character_item';
import { LwpUserInterstitial } from './api/entities/lwp_user_interstitial';
import { LwpMagicLink } from './api/entities/magic_link';
import { StaticLwpMathscotItem } from './api/entities/mathscot_item';
import { StaticLwpParameter } from './api/entities/parameter';
import { LwpPupil } from './api/entities/pupil';
import { LwpPupilMathscot } from './api/entities/pupil_mathscot';
import { LwpPupilParent } from './api/entities/pupil_parent';
import { LwpPupilTopic } from './api/entities/pupil_topic';
import { LwpPupilTrophy } from './api/entities/pupil_trophy';
import { LwpPupilActivity } from './api/entities/pupil-activity';
import { LwpSchool } from './api/entities/school';
import { LwpSchoolClass } from './api/entities/school_class';
import { StaticLwpActivityTag } from './api/entities/static_lwp_activity_tag';
import { StaticLwpDataQuery } from './api/entities/static_lwp_data_query';
import { StaticLwpEmailTemplate } from './api/entities/static_lwp_email_template';
import { StaticLwpFeatures } from './api/entities/static_lwp_features';
import { StaticLwpInterstitial } from './api/entities/static_lwp_interstitial';
import { StaticLwpProgram } from './api/entities/static_lwp_program';
import { StaticLwpSchoolTag } from './api/entities/static_lwp_school_tag';
import { StaticLwpSubject } from './api/entities/static_lwp_subject';
import { StaticLwpTopicTag } from './api/entities/static_lwp_topic_tag';
import { StaticLwpPeriod } from './api/entities/static_period';
import { StaticLwpTopic } from './api/entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from './api/entities/static_topic_domain_year_group';
import { StaticLwpTopicSequence } from './api/entities/static_topic_sequence';
import { StaticLwpTopicSequenceItem } from './api/entities/static_topic_sequence_item';
import { StaticLwpTrophy } from './api/entities/static_trophy';
import { StaticLwpWholeSchoolSequence } from './api/entities/static_whole_school_sequence';
import { StaticLwpWholeSchoolSequenceMember } from './api/entities/static_whole_school_sequence_member';
import { StaticLwpTopicDomain } from './api/entities/topic_domain';
import { LwpUser } from './api/entities/user';
import { LwpUserAssociatedLogin } from './api/entities/user_associated_login';
import { LwpUserSession } from './api/entities/user_session';
import { LwpViewPupilStatus } from './api/entities/views/pupil_status';
import { LwpWholeSchoolSequenceAssignment } from './api/entities/whole_school_sequence_assignment';
import { StaticLwpYearGroup } from './api/entities/year_group';

export const BASE_MODULE_ENTITIES = [
    StaticLwpActivityTag,
    LwpUserAssociatedLogin,
    LwpClassTopic,
    LwpPupilTopic,
    LwpPupilActivity,
    LwpUser,
    LwpSchoolClass,
    StaticLwpTopicTag,
    LwpSchoolImpactReport,
    LwpSchoolImpactReportGraphs,
    StaticLwpSchoolTag,
    StaticLwpMathscotItem,
    LwpPupil,
    LogParentPupilAction,
    LwpPupilTrophy,
    StaticLwpTrophy,
    LogLwpLogin,
    LwpSchool,
    LogLwpAccess,
    LwpPupilMathscot,
    StaticLwpPeriod,
    StaticLwpTopic,
    StaticLwpParameter,
    ImportedStudent,
    StaticLwpActivity,
    StaticLwpInterstitial,
    ImportedSchoolClass,
    StaticLwpYearGroup,
    StaticLwpActivitySteps,
    LwpSchoolDates,
    StaticLwpAdminQuery,
    LwpPupilFeedback,
    LwpFeedbackReply,
    LwpPupilFeedbackMedia,
    LwpSetByTeacherStepMedia,
    ImportedSchool,
    ImportedContact,
    ImportedStudentContact,
    LwpMagicLink,
    LwpPupilParent,
    StaticLwpTopicDomain,
    LwpDemoActivityFeedback,
    LwpSchoolHoliday,
    LwpUserInterstitial,
    LogSchoolClassLicense,
    LwpNotification,
    LwpNotificationEventHistory,
    LwpViewPupilStatus,
    LogStaticLwpEmailTemplateHistory,
    LwpUserSession,
    StaticLwpTopicDomainYearGroup,
    LwpSchoolStaticTags,
    LogLwpParentStickerNotification,
    StaticLwpEmailTemplate,
    StaticLwpDataQuery,
    LwpSticker,
    StaticLwpSubject,
    LwpPupilTag,
    StaticLwpProgram,
    LwpAdminStickerSchoolStatus,
    LwpStickerCharacterItem,
    LwpSchoolImpactReportFeedback,
    LwpPupilFeedbackEditLog,
    StaticLwpFeatures,
    LogLwpPupilClassChange,
    StaticLwpTopicSequence,
    StaticLwpTopicSequenceItem,
    LwpClassSequenceAssignment,
    LwpWholeSchoolSequenceAssignment,
    StaticLwpWholeSchoolSequence,
    StaticLwpWholeSchoolSequenceMember
];
