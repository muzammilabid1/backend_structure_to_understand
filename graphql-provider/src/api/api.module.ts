import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataLoaderInterceptor } from 'nestjs-dataloader';
import { AuthModule } from 'src/auth/auth.module';
import { BaseModule } from 'src/base.module';
import { NotificationModule } from 'src/common/notification';
import { MathscotsController } from 'src/controllers/mathscots.controller';
import { DataImportModule } from 'src/data-import/data-import.module';

import { StaticLwpActivity, StaticLwpActivitySteps } from './entities/activity';
import { StaticLwpAdminQuery } from './entities/admin_query';
import { LwpClassTopic } from './entities/class_topic';
import { LogLwpContact } from './entities/contact';
import { LwpDemoActivityFeedback } from './entities/demo_activity_feedback';
import { StaticLwpFAQ } from './entities/faq';
import { ImportedContact } from './entities/imported_contact';
import { ImportedSchool } from './entities/imported_school';
import { ImportedSchoolClass } from './entities/imported_school_class';
import { ImportedStudent } from './entities/imported_student';
import { ImportedStudentContact } from './entities/imported_student_contact';
import { LogLwpLogin } from './entities/log_login';
import { LogLwpAccess } from './entities/log_lwp_access';
import { LogLwpEntityStatusChange } from './entities/log_lwp_entity_status_change';
import { LogLwpParentStickerNotification } from './entities/log_lwp_parent_sticker_notification';
import { LogParentActivity } from './entities/log_parent_activity';
import { LogParentPupilAction } from './entities/log_parent_pupil_action';
import { LogStaticLwpEmailTemplateHistory } from './entities/log_static_lwp_email_template_history';
import { LwpAdminStickerSchoolStatus } from './entities/lwp_admin_sticker_school_status';
import { LwpFeedbackReply } from './entities/lwp_feedback_reply';
import { LwpNotification } from './entities/lwp_notification';
import { LwpNotificationEventHistory } from './entities/lwp_notification_event_history';
import { LwpPupilFeedback } from './entities/lwp_pupil_feedback';
import { LwpPupilFeedbackEditLog } from './entities/lwp_pupil_feedback_edit_log';
import { LwpPupilFeedbackMedia } from './entities/lwp_pupil_feedback_media';
import { LwpSchoolDates } from './entities/lwp_school_dates';
import { LwpSchoolHoliday } from './entities/lwp_school_holiday';
import { LwpSchoolImpactReport } from './entities/lwp_school_impact_report';
import { LwpSchoolImpactReportFeedback } from './entities/lwp_school_impact_report_feedback';
import { LwpSchoolStaticTags } from './entities/lwp_school_static_tags';
import { LwpSetByTeacherStepMedia } from './entities/lwp_set_by_teacher_step_media';
import { LwpSticker } from './entities/lwp_sticker';
import { LwpStickerCharacterItem } from './entities/lwp_sticker_character_item';
import { LwpUserInterstitial } from './entities/lwp_user_interstitial';
import { LwpUserPageAnnouncement } from './entities/lwp_user_page_announcement';
import { LwpUserTooltipHistory } from './entities/lwp_user_tooltip_history';
import { LwpMagicLink } from './entities/magic_link';
import { StaticLwpMathscotItem } from './entities/mathscot_item';
import { StaticLwpModal } from './entities/modal';
import { StaticLwpNews } from './entities/news';
import { StaticLwpParameter } from './entities/parameter';
import { LwpPupil } from './entities/pupil';
import { LwpPupilMathscot } from './entities/pupil_mathscot';
import { LwpPupilParent } from './entities/pupil_parent';
import { LwpPupilTopic } from './entities/pupil_topic';
import { LwpPupilTrophy } from './entities/pupil_trophy';
import { LwpPupilActivity } from './entities/pupil-activity';
import { StaticLwpResource } from './entities/resource';
import { DateOnly } from './entities/scalar/DateOnly.scalar';
import { LwpSchool } from './entities/school';
import { LwpSchoolClass } from './entities/school_class';
import { StaticLwpDataQuery } from './entities/static_lwp_data_query';
import { StaticLwpEmailTemplate } from './entities/static_lwp_email_template';
import { StaticLwpFeatureTooltip } from './entities/static_lwp_feature_tooltip';
import { StaticLwpFeatures } from './entities/static_lwp_features';
import { StaticLwpFiles } from './entities/static_lwp_files';
import { StaticLwpInterstitial } from './entities/static_lwp_interstitial';
import { StaticLwpPageAnnouncement } from './entities/static_lwp_page_announcement';
import { StaticLwpSchoolTag } from './entities/static_lwp_school_tag';
import { StaticLwpPeriod } from './entities/static_period';
import { StaticLwpTopic } from './entities/static_topic';
import { StaticLwpTopicDomainYearGroup } from './entities/static_topic_domain_year_group';
import { StaticLwpTrophy } from './entities/static_trophy';
import { StaticLwpTopicDomain } from './entities/topic_domain';
import { LwpUser } from './entities/user';
import { LwpUserAssociatedLogin } from './entities/user_associated_login';
import { StaticLwpYearGroup } from './entities/year_group';
import { ActivityLoader } from './loader/activity.loader';
import { ActivityRationaleModalLoader } from './loader/activity_rationale_modal.loader';
import { ActivityStepsLoader } from './loader/activity_steps.loader';
import { ActivityTagsLoader } from './loader/activity_tags.loader';
import { ActivityTopicLoader } from './loader/activity_topic.loader';
import { DomainSubjectLoader } from './loader/domain_subject.loader';
import { DomainsLoader } from './loader/domains.loader';
import { HasSchoolLeadersAwaitingWelcomeBySchoolIdLoader } from './loader/has_school_leaders_awaiting_welcome_by_school.loader';
import { HasUninvitedStaffBySchoolIdLoader } from './loader/has_uninvited_staff_by_school.loader';
import { LwpPupilFeedbackLastActionLoader, LwpPupilFeedbackLoader, LwpPupilFeedbackSchoolLoader } from './loader/lwp_pupil_feedback.loader';
import { MoneySkillsAutoScheduleByClassIdLoader } from './loader/money_skills_auto_schedule_by_class.loader';
import { PupilActivitiesLoader } from './loader/pupil_activities.loader';
import { PupilCurrentRTTopicLoader } from './loader/pupil_current_rt_topic.loader';
import { ReadyTeddyLoader } from './loader/ready_teddy.loader';
import { SbtStepMediaLoader } from './loader/sbt_step_media.loader';
import { SchoolCommentsAndPhotosLoader } from './loader/school_comments_and_photos.loader';
import { SchoolNextPeriodLoader } from './loader/school_next_period.loader';
import { SchoolPeriodsLoader } from './loader/school_periods.loader';
import { SchoolTagsLoader } from './loader/school_tags.loader';
import { SchoolTagsBySchoolIdLoader } from './loader/school_tags_by_school.loader';
import { SequenceAssignmentUsageBySequenceIdLoader } from './loader/sequence_assignment_usage_by_sequence.loader';
import { SetByTeacherStepsLoader } from './loader/set_by_teacher_steps.loader';
import { TagsLoader } from './loader/tags.loader';
import { TopicReleasedInCurrentOrFutureYearLoader } from './loader/topic_released_in_current_or_future_year.loader';
import { WholeSchoolAssignmentUsageBySequenceIdLoader } from './loader/whole_school_assignment_usage_by_sequence.loader';
import { YearGroupsLoader } from './loader/year_groups.loader';
import { ActivityResolver } from './resolver/activity.resolver';
import { AdminResolver } from './resolver/admin.resolver';
import { ClassSequenceAssignmentResolver } from './resolver/class_sequence_assignment.resolver';
import { ClassTopicResolver } from './resolver/class_topic.resolver';
import { ContactResolver } from './resolver/contact.resolver';
import { DemoActivityFeedbackResolver } from './resolver/demo_activity_feedback.resolver';
import { FAQResolver } from './resolver/faq.resolver';
import { ImportedContactResolver } from './resolver/imported_contact.resolver';
import { ImportedSchoolResolver } from './resolver/imported_school.resolver';
import { ImportedSchoolClassResolver } from './resolver/imported_school_class.resolver';
import { ImportedStudentResolver } from './resolver/imported_student.resolver';
import { ImportedStudentContactResolver } from './resolver/imported_student_contact.resolver';
import { LogLwpLoginResolver } from './resolver/log_login.resolver';
import { LogLwpAccessResolver } from './resolver/log_lwp_access.resolver';
import { LogParentPupilActionResolver } from './resolver/log_parent_pupil_action.resolver';
import { LwpDataQueryResolver } from './resolver/lwp_data_query.resolver';
import { LwpFeedbackReplyResolver } from './resolver/lwp_feedback_reply.resolver';
import { LwpNotificationResolver } from './resolver/lwp_notification.resolver';
import { LwpNotificationContextResolver } from './resolver/lwp_notification_context_resolver';
import { LwpPupilFeedbackResolver } from './resolver/lwp_pupil_feedback.resolver';
import { LwpPupilFeedbackMediaResolver } from './resolver/lwp_pupil_feedback_media.resolver';
import { LwpPupilTagResolver } from './resolver/lwp_pupil_tag.resolver';
import { LwpSchoolDatesResolver } from './resolver/lwp_school_dates.resolver';
import { LwpSchoolHolidayResolver } from './resolver/lwp_school_holiday.resolver';
import { LwpSchoolImpactReportResolver } from './resolver/lwp_school_impact_report.resolver';
import { LwpSchoolImpactReportFeedbackResolver } from './resolver/lwp_school_impact_report_feedback.resolver';
import { LwpSchoolImpactReportGraphsResolver } from './resolver/lwp_school_impact_report_graphs.resolver';
import { LwpStickerResolver } from './resolver/lwp_sticker.resolver';
import { LwpStickerCharacterItemResolver } from './resolver/lwp_sticker_character_item.resolver';
import { LwpUserPageAnnouncementResolver } from './resolver/lwp_user_page_announcement.resolver';
import { LwpUserTooltipHistoryResolver } from './resolver/lwp_user_tooltip_history.resolver';
import { MagicLinkResolver } from './resolver/magic_link.resolver';
import { MathscotItemResolver } from './resolver/mathscot-item.resolver';
import { ModalResolver } from './resolver/modal.resolver';
import { NewsResolver } from './resolver/news.resolver';
import { ParameterResolver } from './resolver/parameter.resolver';
import { ParentResolver } from './resolver/parent.resolver';
import { PupilResolver } from './resolver/pupil.resolver';
import { PupilMathscotResolver } from './resolver/pupil_mathscot.resolver';
import { PupilParentResolver } from './resolver/pupil_parent.resolver';
import { PupilTopicResolver } from './resolver/pupil_topic.resolver';
import { PupilActivityResolver } from './resolver/pupil-activity.resolver';
import { ResourceResolver } from './resolver/resource.resolver';
import { SchoolResolver } from './resolver/school.resolver';
import { SchoolClassResolver } from './resolver/school_class.resolver';
import { ScrapbookResolver } from './resolver/scrapbook.resolver';
import { StaticLwpActivityStepResolver } from './resolver/static_lwp_activity_step.resolver';
import { StaticLwpActivityTagResolver } from './resolver/static_lwp_activity_tag.resolver';
import { StaticLwpEmailTemplateResolver } from './resolver/static_lwp_email_template.resolver';
import { StaticLwpFeatureTooltipResolver } from './resolver/static_lwp_feature_tooltip.resolver';
import { StaticLwpFeaturesResolver } from './resolver/static_lwp_features.resolver';
import { StaticLwpFileResolver } from './resolver/static_lwp_files.resolver';
import { StaticLwpInterstitialResolver } from './resolver/static_lwp_interstitial.resolver';
import { StaticLwpPageAnnouncementResolver } from './resolver/static_lwp_page_announcement.resolver';
import { StaticLwpProgramResolver } from './resolver/static_lwp_program.resolver';
import { StaticLwpSchoolTagResolver } from './resolver/static_lwp_school_tag.resolver';
import { StaticLwpSubjectResolver } from './resolver/static_lwp_subject.resolver';
import { StaticLwpTopicTagResolver } from './resolver/static_lwp_topic_tag.resolver';
import { StaticLwpPeriodResolver } from './resolver/static_period.resolver';
import { StaticLwpTopicDomainYearGroupResolver } from './resolver/static_topic_domain_year_group.resolver';
import { StaticTrophyResolver } from './resolver/static_trophy.resolver';
import { TeacherResolver } from './resolver/teacher.resolver';
import { TopicResolver } from './resolver/topic.resolver';
import { TopicDomainResolver } from './resolver/topic_domain.resolver';
import { TopicSequenceResolver } from './resolver/topic_sequence.resolver';
import { TrophyResolver } from './resolver/trophy.resolver';
import { UserResolver } from './resolver/user.resolver';
import { WholeSchoolAutoScheduleResolver } from './resolver/whole_school_auto_schedule.resolver';
import { WholeSchoolSequenceResolver } from './resolver/whole_school_sequence.resolver';
import { YearGroupResolver } from './resolver/year_group.resolver';
import { ContactService } from './service/contact.service';
import { DemoActivityFeedbackService } from './service/demo_activity_feedback.service';
import { FAQService } from './service/faq.service';
import { ImportedContactService } from './service/imported_contact.service';
import { ImportedSchoolService } from './service/imported_school.service';
import { ImportedSchoolClassService } from './service/imported_school_class.service';
import { ImportedStudentService } from './service/imported_student.service';
import { ImportedStudentContactService } from './service/imported_student_contact.service';
import { LogLwpEntityStatusChangeService } from './service/log_lwp_user_status_change.service';
import { LwpNotificationService } from './service/lwp_notification.service';
import { LwpSchoolImpactReportFeedbackService } from './service/lwp_school_impact_report_feedback.service';
import { LwpSchoolStaticTagService } from './service/lwp_school_static_tag.service';
import { LwpStickerService } from './service/lwp_sticker.service';
import { LwpStickerCharacterItemService } from './service/lwp_sticker_character_item.service';
import { LwpUserPageAnnouncementService } from './service/lwp_user_page_announcement.service';
import { LwpUserTooltipHistoryService } from './service/lwp_user_tooltip_history.service';
import { ModalService } from './service/modal.service';
import { NewsService } from './service/news.service';
import { ParentService } from './service/parent.service';
import { ResourceService } from './service/resource.service';
import { ScrapbookService } from './service/scrapbook.service';
import { StaticLwpEmailTemplateService } from './service/static_lwp_email_template.service';
import { StaticLwpFeatureTooltipService } from './service/static_lwp_feature_tooltip.service';
import { StaticLwpFeaturesService } from './service/static_lwp_features.service';
import { StaticLwpFileService } from './service/static_lwp_files.service';
import { StaticLwpPageAnnouncementService } from './service/static_lwp_page_announcement.service';
import { StaticLwpTopicDomainYearGroupService } from './service/static_topic_domain_year_group.service';

@Module({
    imports: [
        BaseModule,
        forwardRef(() => AuthModule),
        TypeOrmModule.forFeature([
            StaticLwpActivity,
            StaticLwpActivitySteps,
            LwpPupil,
            LwpSchoolClass,
            StaticLwpMathscotItem,
            StaticLwpTopic,
            LwpClassTopic,
            LwpPupilActivity,
            LwpPupilTopic,
            LwpUser,
            LwpSchool,
            StaticLwpFAQ,
            LogLwpContact,
            StaticLwpTopicDomain,
            StaticLwpNews,
            StaticLwpResource,
            StaticLwpParameter,
            StaticLwpYearGroup,
            LogLwpLogin,
            LogParentActivity,
            LogParentPupilAction,
            StaticLwpTrophy,
            LwpPupilTrophy,
            ImportedSchool,
            ImportedSchoolClass,
            ImportedStudent,
            StaticLwpFiles,
            StaticLwpInterstitial,
            StaticLwpPageAnnouncement,
            LogLwpAccess,
            ImportedStudentContact,
            LwpDemoActivityFeedback,
            StaticLwpPeriod,
            LwpPupilMathscot,
            ImportedContact,
            StaticLwpModal,
            LwpSchoolDates,
            StaticLwpAdminQuery,
            StaticLwpDataQuery,
            LwpPupilFeedback,
            LwpFeedbackReply,
            LwpPupilFeedbackMedia,
            LwpSetByTeacherStepMedia,
            LwpMagicLink,
            LwpPupilParent,
            LwpUserAssociatedLogin,
            LwpUserInterstitial,
            LwpSchoolHoliday,
            LwpNotification,
            LwpNotificationEventHistory,
            LogLwpEntityStatusChange,
            LogStaticLwpEmailTemplateHistory,
            LogLwpParentStickerNotification,
            StaticLwpEmailTemplate,
            StaticLwpTopicDomainYearGroup,
            LwpSchoolStaticTags,
            LwpUserTooltipHistory,
            LwpSticker,
            LwpAdminStickerSchoolStatus,
            LwpStickerCharacterItem,
            LwpSchoolImpactReportFeedback,
            LwpSchoolImpactReport,
            LwpPupilFeedbackEditLog,
            StaticLwpFeatures,
            StaticLwpSchoolTag,
            StaticLwpFeatureTooltip,
            LwpUserPageAnnouncement
        ]),
        NotificationModule.register(),
        HttpModule,
        DataImportModule
    ],
    providers: [
        ParentResolver,
        TeacherResolver,
        PupilResolver,
        SchoolClassResolver,
        MathscotItemResolver,
        ActivityResolver,
        TopicResolver,
        ClassTopicResolver,
        ClassSequenceAssignmentResolver,
        PupilActivityResolver,
        UserResolver,
        PupilTopicResolver,
        SchoolResolver,
        FAQResolver,
        FAQService,
        ParentService,
        ContactService,
        ContactResolver,
        TopicDomainResolver,
        TopicSequenceResolver,
        WholeSchoolSequenceResolver,
        WholeSchoolAutoScheduleResolver,
        NewsService,
        NewsResolver,
        AdminResolver,
        ResourceResolver,
        ResourceService,
        ParameterResolver,
        YearGroupResolver,
        LogParentPupilActionResolver,
        StaticTrophyResolver,
        TrophyResolver,
        ImportedSchoolClassService,
        ImportedSchoolClassResolver,
        ImportedStudentResolver,
        ImportedStudentService,
        StaticLwpFileResolver,
        StaticLwpFileService,
        StaticLwpInterstitialResolver,
        ImportedSchoolService,
        ImportedSchoolResolver,
        LogLwpAccessResolver,
        DemoActivityFeedbackResolver,
        DemoActivityFeedbackService,
        StaticLwpPeriodResolver,
        PupilMathscotResolver,
        ImportedStudentContactResolver,
        ImportedStudentContactService,
        ImportedContactResolver,
        ImportedContactService,
        ModalService,
        ModalResolver,
        StaticLwpActivityStepResolver,
        LwpSchoolDatesResolver,
        LwpDataQueryResolver,
        LwpPupilFeedbackResolver,
        LwpFeedbackReplyResolver,
        LwpPupilFeedbackMediaResolver,
        ScrapbookResolver,
        ScrapbookService,
        LogLwpLoginResolver,
        MagicLinkResolver,
        LwpPupilParent,
        PupilParentResolver,
        StaticLwpActivityTagResolver,
        StaticLwpTopicTagResolver,
        LwpSchoolImpactReportResolver,
        LwpSchoolImpactReportGraphsResolver,
        StaticLwpSchoolTagResolver,
        LwpSchoolHolidayResolver,
        LwpNotificationResolver,
        LwpNotificationContextResolver,
        LwpNotificationService,
        LogLwpEntityStatusChangeService,
        StaticLwpEmailTemplateService,
        StaticLwpTopicDomainYearGroupResolver,
        StaticLwpTopicDomainYearGroupService,
        LwpSchoolStaticTagService,
        LwpUserTooltipHistoryResolver,
        LwpUserTooltipHistoryService,
        LwpStickerService,
        LwpStickerCharacterItemService,
        LwpStickerResolver,
        StaticLwpEmailTemplateResolver,
        LwpPupilTagResolver,
        StaticLwpSubjectResolver,
        StaticLwpProgramResolver,
        LwpStickerCharacterItemResolver,
        StaticLwpEmailTemplateResolver,
        DateOnly,
        LwpSchoolImpactReportFeedbackResolver,
        LwpSchoolImpactReportFeedbackService,
        StaticLwpFeaturesResolver,
        StaticLwpFeaturesService,
        StaticLwpFeatureTooltipService,
        StaticLwpFeatureTooltipResolver,
        StaticLwpPageAnnouncementResolver,
        StaticLwpPageAnnouncementService,
        LwpPupilFeedbackLoader,
        LwpPupilFeedbackLastActionLoader,
        LwpPupilFeedbackSchoolLoader,
        PupilActivitiesLoader,
        SbtStepMediaLoader,
        PupilCurrentRTTopicLoader,
        LwpUserPageAnnouncementResolver,
        LwpUserPageAnnouncementService,
        ActivityLoader,
        ActivityStepsLoader,
        DomainSubjectLoader,
        DomainsLoader,
        YearGroupsLoader,
        TagsLoader,
        SchoolTagsLoader,
        ReadyTeddyLoader,
        SetByTeacherStepsLoader,
        TopicReleasedInCurrentOrFutureYearLoader,
        ActivityTopicLoader,
        ActivityRationaleModalLoader,
        ActivityTagsLoader,
        SchoolTagsBySchoolIdLoader,
        HasUninvitedStaffBySchoolIdLoader,
        HasSchoolLeadersAwaitingWelcomeBySchoolIdLoader,
        SchoolPeriodsLoader,
        SchoolNextPeriodLoader,
        MoneySkillsAutoScheduleByClassIdLoader,
        SequenceAssignmentUsageBySequenceIdLoader,
        WholeSchoolAssignmentUsageBySequenceIdLoader,
        SchoolCommentsAndPhotosLoader,
        {
            provide: APP_INTERCEPTOR,
            useClass: DataLoaderInterceptor
        }
    ],
    exports: [],
    controllers: [MathscotsController]
})
export class ApiModule {}
