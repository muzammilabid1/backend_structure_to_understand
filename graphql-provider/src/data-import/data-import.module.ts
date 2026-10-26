import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaticLwpActivity, StaticLwpActivitySteps } from 'src/api/entities/activity';
import { LwpClassTopic } from 'src/api/entities/class_topic';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { ImportedSchoolDataProposedChange } from 'src/api/entities/imported_school_data_proposed_change';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { LogParentPupilAction } from 'src/api/entities/log_parent_pupil_action';
import { LwpFeedbackReply } from 'src/api/entities/lwp_feedback_reply';
import { LwpNotification } from 'src/api/entities/lwp_notification';
import { LwpNotificationEventHistory } from 'src/api/entities/lwp_notification_event_history';
import { LwpPupilFeedback } from 'src/api/entities/lwp_pupil_feedback';
import { LwpPupilFeedbackEditLog } from 'src/api/entities/lwp_pupil_feedback_edit_log';
import { LwpPupilFeedbackMedia } from 'src/api/entities/lwp_pupil_feedback_media';
import { LwpSchoolHoliday } from 'src/api/entities/lwp_school_holiday';
import { LwpMagicLink } from 'src/api/entities/magic_link';
import { StaticLwpMathscotItem } from 'src/api/entities/mathscot_item';
import { StaticLwpParameter } from 'src/api/entities/parameter';
import { LwpPupil } from 'src/api/entities/pupil';
import { LwpPupilMathscot } from 'src/api/entities/pupil_mathscot';
import { LwpPupilParent } from 'src/api/entities/pupil_parent';
import { LwpPupilTopic } from 'src/api/entities/pupil_topic';
import { LwpPupilTrophy } from 'src/api/entities/pupil_trophy';
import { LwpPupilActivity } from 'src/api/entities/pupil-activity';
import { LwpSchool } from 'src/api/entities/school';
import { LwpSchoolClass } from 'src/api/entities/school_class';
import { StaticLwpEmailTemplate } from 'src/api/entities/static_lwp_email_template';
import { StaticLwpPeriod } from 'src/api/entities/static_period';
import { StaticLwpTopic } from 'src/api/entities/static_topic';
import { LwpUser } from 'src/api/entities/user';
import { StaticLwpYearGroup } from 'src/api/entities/year_group';
import { BaseModule } from 'src/base.module';
import { NotificationModule } from 'src/common/notification';
import { ClassChangeService } from 'src/data-import/service/class-change.service';
import { ClassLinkService } from 'src/data-import/service/class-link.service';
import { DataImportService } from 'src/data-import/service/data-import.service';
import { EntityChangeService } from 'src/data-import/service/entity-change.service';
import { EntityLinkService } from 'src/data-import/service/entity-link.service';
import { ImportStatusService } from 'src/data-import/service/import-status.service';
import { PupilChangeService } from 'src/data-import/service/pupil-change.service';
import { PupilLinkService } from 'src/data-import/service/pupil-link.service';
import { DatabaseOrmModule } from 'src/setup/database.orm.module';

import { EntityChangeResolver } from './resolver/entity-change.resolver';
import { EntityLinkResolver } from './resolver/entity-link.resolver';
@Module({
    imports: [
        forwardRef(() => BaseModule),
        DatabaseOrmModule.registerAsync(),
        NotificationModule.register(),
        HttpModule,
        TypeOrmModule.forFeature([
            LwpSchool,
            StaticLwpMathscotItem,
            LwpSchoolClass,
            StaticLwpActivitySteps,
            LwpClassTopic,
            LwpPupilTopic,
            LwpPupilMathscot,
            ImportedStudent,
            LwpPupilActivity,
            LwpSchoolHoliday,
            LwpUser,
            LogParentPupilAction,
            StaticLwpParameter,
            StaticLwpTopic,
            StaticLwpActivity,
            ImportedSchool,
            LwpPupilFeedback,
            LwpPupilFeedbackMedia,
            LwpPupil,
            LwpPupilFeedbackEditLog,
            LwpFeedbackReply,
            LwpPupilParent,
            LwpMagicLink,
            LwpPupilTrophy,
            LwpNotification,
            LwpNotificationEventHistory,
            StaticLwpEmailTemplate,
            StaticLwpYearGroup,
            StaticLwpPeriod,
            ImportedSchoolDataProposedChange
        ]),
        NotificationModule.register()
    ],
    providers: [
        DataImportService,
        ImportStatusService,
        EntityLinkService,
        EntityLinkResolver,
        EntityChangeResolver,
        PupilLinkService,
        ClassLinkService,
        EntityChangeService,
        PupilChangeService,
        ClassChangeService
    ],
    exports: [DataImportService]
})
export class DataImportModule {}
