import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SchedulerRegistry } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from 'src/api/service/activity.service';
import { AdminService } from 'src/api/service/admin.service';
import { CertificateService } from 'src/api/service/certificate.service';
import { ClassSequenceAssignmentService } from 'src/api/service/class_sequence_assignment.service';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { HelperService } from 'src/api/service/helper.service';
import { LogSchoolClassLicenseService } from 'src/api/service/log_class_license.service';
import { LogLoginService } from 'src/api/service/log_login.service';
import { LogLwpAccessService } from 'src/api/service/log_lwp_access.service';
import { LogParentPupilActionService } from 'src/api/service/log_parent_pupil_action.service';
import { LwpNotificationService } from 'src/api/service/lwp_notification.service';
import { LwpPupilFeedbackService } from 'src/api/service/lwp_pupil_feedback.service';
import { LwpPupilFeedbackMediaService } from 'src/api/service/lwp_pupil_feedback_media.service';
import { LwpSchoolDatesService } from 'src/api/service/lwp_school_dates.service';
import { LwpSchoolHolidayService } from 'src/api/service/lwp_school_holiday.service';
import { MagicLinkService } from 'src/api/service/magic_link.service';
import { MathscotItemService } from 'src/api/service/mathscot-item.service';
import { MinioService } from 'src/api/service/minio.service';
import { NotificationService } from 'src/api/service/notification.service';
import { ParameterService } from 'src/api/service/parameter.service';
import { PDFService } from 'src/api/service/pdf.service';
import { PupilService } from 'src/api/service/pupil.service';
import { PupilActivityService } from 'src/api/service/pupil_activity.service';
import { PupilMathscotService } from 'src/api/service/pupil_mathscot.service';
import { PupilParentService } from 'src/api/service/pupil_parent.service';
import { PupilTopicService } from 'src/api/service/pupil_topic.service';
import { QueryBaseService } from 'src/api/service/query_base.service';
import { SchoolService } from 'src/api/service/school.service';
import { SchoolClassService } from 'src/api/service/school_class.service';
import { StaticLwpActivityTagService } from 'src/api/service/static_lwp_activity_tag.service';
import { StaticLwpInterstitialService } from 'src/api/service/static_lwp_interstitial.service';
import { StaticLwpPeriodService } from 'src/api/service/static_period.service';
import { StaticTrophyService } from 'src/api/service/static_trophy.service';
import { TeacherService } from 'src/api/service/teacher.service';
import { TopicService } from 'src/api/service/topic.service';
import { TopicDomainService } from 'src/api/service/topic_domain.service';
import { TopicSequenceService } from 'src/api/service/topic_sequence.service';
import { TrophyService } from 'src/api/service/trophy.service';
import { WholeSchoolAutoScheduleService } from 'src/api/service/whole_school_auto_schedule.service';
import { WholeSchoolSequenceService } from 'src/api/service/whole_school_sequence.service';
import { YearGroupService } from 'src/api/service/year_group.service';
import { AuthenticationService } from 'src/auth/service/authentication.service';
import { UsersService } from 'src/auth/service/user.service';
import { appConstants } from 'src/constants';

import { LwpNotificationEventHistory } from './api/entities/lwp_notification_event_history';
import { LwpDataQueryService } from './api/service/lwp_data_query.service';
import { LwpFeedbackReplyService } from './api/service/lwp_feedback_reply.service';
import { LwpPupilTagService } from './api/service/lwp_pupil_tag.service';
import { LwpSchoolImpactReportService } from './api/service/lwp_school_impact_report.service';
import { LwpSchoolImpactReportFeedbackService } from './api/service/lwp_school_impact_report_feedback.service';
import { LwpSchoolStaticTagService } from './api/service/lwp_school_static_tag.service';
import { LwpStickerService } from './api/service/lwp_sticker.service';
import { LwpStickerCharacterItemService } from './api/service/lwp_sticker_character_item.service';
import { StaticLwpFeaturesService } from './api/service/static_lwp_features.service';
import { StaticLwpProgramService } from './api/service/static_lwp_program.service';
import { StaticLwpSchoolTagService } from './api/service/static_lwp_school_tag.service';
import { StaticLwpSubjectService } from './api/service/static_lwp_subject.service';
import { StaticLwpTopicTagService } from './api/service/static_lwp_topic_tag.service';
import { StaticLwpTopicDomainYearGroupService } from './api/service/static_topic_domain_year_group.service';
import { WondeService } from './api/service/wonde.service';
import { ShallowUserService } from './auth/service/shallowuser.service';
import { BASE_MODULE_ENTITIES } from './base.module.entities';
import { NotificationModule } from './common/notification/notification.module';
import { DataImportModule } from './data-import/data-import.module';
import { DatabaseOrmModule } from './setup/database.orm.module';
import { MinioModule } from './setup/minio.module';
import { SetupModule } from './setup/setup.module';
import { EmailTask } from './task/email.task';

@Module({
    imports: [
        SetupModule,
        DatabaseOrmModule.registerAsync(),
        HttpModule,
        TypeOrmModule.forFeature(BASE_MODULE_ENTITIES),
        NotificationModule.register(),
        forwardRef(() => DataImportModule),
        JwtModule.register({
            secret: process.env.LWP_JWT_SECRET ? `${process.env.LWP_JWT_SECRET} ` : appConstants.jwt.secret,
            signOptions: { expiresIn: appConstants.jwt.expiresIn }
        }),
        MinioModule
    ],
    providers: [
        EmailTask,
        HelperService,
        NotificationService,
        ShallowUserService,
        TrophyService,
        CertificateService,
        PDFService,
        MathscotItemService,
        MinioService,
        LogParentPupilActionService,
        UsersService,
        LogLoginService,
        AuthenticationService,
        SchedulerRegistry,
        StaticLwpPeriodService,
        PupilMathscotService,
        PupilService,
        QueryBaseService,
        PupilTopicService,
        PupilActivityService,
        StaticTrophyService,
        ClassTopicService,
        ClassSequenceAssignmentService,
        ParameterService,
        SchoolClassService,
        YearGroupService,
        LogSchoolClassLicenseService,
        LogLwpAccessService,
        SchoolService,
        TeacherService,
        LwpSchoolDatesService,
        LwpDataQueryService,
        LwpPupilFeedbackService,
        LwpFeedbackReplyService,
        LwpPupilFeedbackMediaService,
        WondeService,
        MagicLinkService,
        PupilParentService,
        TopicService,
        TopicDomainService,
        TopicSequenceService,
        WholeSchoolSequenceService,
        WholeSchoolAutoScheduleService,
        ActivityService,
        AdminService,
        StaticLwpActivityTagService,
        StaticLwpTopicTagService,
        LwpSchoolImpactReportService,
        StaticLwpSchoolTagService,
        LwpSchoolHolidayService,
        StaticLwpInterstitialService,
        LwpNotificationService,
        LwpNotificationEventHistory,
        StaticLwpTopicDomainYearGroupService,
        LwpSchoolStaticTagService,
        LwpStickerService,
        StaticLwpSubjectService,
        LwpPupilTagService,
        StaticLwpProgramService,
        LwpStickerCharacterItemService,
        LwpSchoolImpactReportFeedbackService,
        StaticLwpFeaturesService
    ],
    exports: [
        EmailTask,
        HelperService,
        NotificationService,
        TrophyService,
        CertificateService,
        PDFService,
        MathscotItemService,
        MinioService,
        LogParentPupilActionService,
        UsersService,
        LogLoginService,
        AuthenticationService,
        SchedulerRegistry,
        StaticLwpPeriodService,
        PupilMathscotService,
        PupilService,
        QueryBaseService,
        PupilTopicService,
        PupilActivityService,
        StaticTrophyService,
        ClassTopicService,
        ClassSequenceAssignmentService,
        ParameterService,
        SchoolClassService,
        YearGroupService,
        LogLwpAccessService,
        SchoolService,
        TeacherService,
        LwpSchoolDatesService,
        LwpDataQueryService,
        LwpPupilFeedbackService,
        LwpFeedbackReplyService,
        LwpPupilFeedbackMediaService,
        WondeService,
        MagicLinkService,
        PupilParentService,
        TopicService,
        TopicDomainService,
        TopicSequenceService,
        WholeSchoolSequenceService,
        WholeSchoolAutoScheduleService,
        ActivityService,
        AdminService,
        StaticLwpActivityTagService,
        StaticLwpTopicTagService,
        LwpSchoolImpactReportService,
        StaticLwpSchoolTagService,
        LwpSchoolHolidayService,
        StaticLwpInterstitialService,
        LwpNotificationService,
        LwpNotificationEventHistory,
        ShallowUserService,
        LwpStickerService,
        LwpPupilTagService,
        StaticLwpSubjectService,
        StaticLwpProgramService,
        LwpStickerCharacterItemService,
        StaticLwpFeaturesService
    ]
})
export class BaseModule {}
