import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleRecaptchaModule } from '@nestlab/google-recaptcha';
import { IncomingMessage } from 'http';
import { ApiModule } from 'src/api/api.module';
import { StaticLwpActivitySteps } from 'src/api/entities/activity';
import { LwpClassTopic } from 'src/api/entities/class_topic';
import { ImportedSchool } from 'src/api/entities/imported_school';
import { ImportedSchoolClass } from 'src/api/entities/imported_school_class';
import { ImportedStudent } from 'src/api/entities/imported_student';
import { LogLwpLogin } from 'src/api/entities/log_login';
import { LogLwpAccess } from 'src/api/entities/log_lwp_access';
import { LogParentPupilAction } from 'src/api/entities/log_parent_pupil_action';
import { LogStaticLwpEmailTemplateHistory } from 'src/api/entities/log_static_lwp_email_template_history';
import { LwpFeedbackReply } from 'src/api/entities/lwp_feedback_reply';
import { LwpNotification } from 'src/api/entities/lwp_notification';
import { LwpNotificationEventHistory } from 'src/api/entities/lwp_notification_event_history';
import { LwpPupilFeedback } from 'src/api/entities/lwp_pupil_feedback';
import { LwpSchoolHoliday } from 'src/api/entities/lwp_school_holiday';
import { LwpSetByTeacherStepMedia } from 'src/api/entities/lwp_set_by_teacher_step_media';
import { LwpUserInterstitial } from 'src/api/entities/lwp_user_interstitial';
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
import { StaticLwpFeatures } from 'src/api/entities/static_lwp_features';
import { StaticLwpInterstitial } from 'src/api/entities/static_lwp_interstitial';
import { StaticLwpSchoolTag } from 'src/api/entities/static_lwp_school_tag';
import { StaticLwpSubject } from 'src/api/entities/static_lwp_subject';
import { StaticLwpPeriod } from 'src/api/entities/static_period';
import { StaticLwpTopic } from 'src/api/entities/static_topic';
import { LwpUser } from 'src/api/entities/user';
import { LwpUserAssociatedLogin } from 'src/api/entities/user_associated_login';
import { LwpUserSession } from 'src/api/entities/user_session';
import { HelperService } from 'src/api/service/helper.service';
import { LogLoginService } from 'src/api/service/log_login.service';
import { LogLwpAccessService } from 'src/api/service/log_lwp_access.service';
import { LogParentPupilActionService } from 'src/api/service/log_parent_pupil_action.service';
import { LwpNotificationService } from 'src/api/service/lwp_notification.service';
import { MagicLinkService } from 'src/api/service/magic_link.service';
import { NotificationService } from 'src/api/service/notification.service';
import { ParameterService } from 'src/api/service/parameter.service';
import { PupilParentService } from 'src/api/service/pupil_parent.service';
import { StaticLwpFeaturesService } from 'src/api/service/static_lwp_features.service';
import { StaticLwpInterstitialService } from 'src/api/service/static_lwp_interstitial.service';
import { UsersService } from 'src/auth/service/user.service';
import { NotificationModule } from 'src/common/notification';

import { appConstants } from '../constants';
import { AuthResolver } from './auth.resolver';
import { AuthenticationGuard } from './authentication.guard';
import { AuthorizationGuard } from './authorization.guard';
import { GqlThrottlerGuard } from './guards/gql-throttler.guard';
import { AuthenticationService } from './service/authentication.service';
import { ShallowUserService } from './service/shallowuser.service';

@Module({
    imports: [
        forwardRef(() => ApiModule),
        TypeOrmModule.forFeature([
            LogStaticLwpEmailTemplateHistory,
            LwpUserAssociatedLogin,
            LwpUser,
            LwpUserSession,
            LwpSchool,
            LogLwpLogin,
            LwpPupil,
            LwpSchoolClass,
            StaticLwpPeriod,
            StaticLwpFeatures,
            StaticLwpMathscotItem,
            LwpClassTopic,
            LwpPupilTopic,
            LwpPupilActivity,
            LwpSchoolHoliday,
            LogParentPupilAction,
            StaticLwpEmailTemplate,
            StaticLwpActivitySteps,
            LwpMagicLink,
            StaticLwpParameter,
            LwpPupilTrophy,
            LwpPupilParent,
            LwpPupilMathscot,
            LogLwpAccess,
            StaticLwpInterstitial,
            LwpUserInterstitial,
            StaticLwpSchoolTag,
            LwpNotification,
            LwpNotificationEventHistory,
            LwpPupilFeedback,
            LwpFeedbackReply,
            ImportedSchool,
            ImportedSchoolClass,
            ImportedStudent,
            StaticLwpSubject,
            StaticLwpTopic,
            LwpSetByTeacherStepMedia
        ]),
        JwtModule.register({
            secret: process.env.LWP_JWT_SECRET ? `${process.env.LWP_JWT_SECRET} ` : appConstants.jwt.secret,
            signOptions: { expiresIn: appConstants.jwt.expiresIn }
        }),
        NotificationModule.register(),
        HttpModule,
        GoogleRecaptchaModule.forRoot({
            secretKey: process.env.RECAPTCHA_SECRET_KEY,
            response: (req: IncomingMessage) => (req.headers['recaptcha-token'] || '').toString(),
            skipIf: (untypedReq) => {
                // N.B. Nestlabs' Google Recaptcha type definitions are dodgy, necessitating the explicit type cast here
                const req = untypedReq as Request;

                if (process.env.RECAPTCHA_SECRET_KEY === 'none') {
                    return true;
                }

                const skipRecaptchaToken = process.env.SKIP_RECAPTCHA_SECRET_TOKEN;

                return skipRecaptchaToken && req.headers?.['x-lwp-skip-recaptcha'] === skipRecaptchaToken;
            },
            actions: [],
            network: 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
        }),
        ThrottlerModule.forRoot({
            throttlers: [
                // default rate limiting config
                {
                    name: 'default',
                    ttl: 60 * 1e3, // 1 minute window
                    limit: 10, // max requests in a given window (0 = no throttling)
                    skipIf: (): boolean => process.env.NODE_ENV === 'test'
                }
            ]
        })
    ],
    controllers: [],
    providers: [
        AuthResolver,
        AuthenticationService,
        UsersService,
        ShallowUserService,
        HelperService,
        NotificationService,
        LogLoginService,
        LogParentPupilActionService,
        MagicLinkService,
        ParameterService,
        PupilParentService,
        LogLwpAccessService,
        StaticLwpInterstitialService,
        StaticLwpFeaturesService,
        LwpNotificationService,
        GqlThrottlerGuard,
        {
            provide: APP_GUARD,
            useClass: AuthenticationGuard
        },
        {
            provide: APP_GUARD,
            useClass: AuthorizationGuard
        }
    ],
    exports: [AuthenticationService, UsersService]
})
export class AuthModule {}
