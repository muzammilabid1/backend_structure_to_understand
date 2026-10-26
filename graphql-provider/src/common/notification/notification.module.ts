import { DynamicModule, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from 'nestjs-config';
import * as path from 'path';
import { LwpNotification } from 'src/api/entities/lwp_notification';
import { LwpNotificationEventHistory } from 'src/api/entities/lwp_notification_event_history';

import { MailgunService } from './service/mailgun.service';
import { MockEmailService } from './service/mockemail.service';
import { SendInBlueService } from './service/sendinblue.service';
import { TwilioService } from './service/twilio.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([LwpNotification, LwpNotificationEventHistory]),
        ConfigModule.load(path.resolve(__dirname, 'config', '**/!(*.d).{ts,js}'))
    ]
})
export class NotificationModule {
    static register(): DynamicModule {
        return {
            module: NotificationModule,
            imports: process.env.ALLOW_SCHEDULING === 'true' ? [ScheduleModule.forRoot()] : [],
            providers: [
                {
                    provide: 'EmailService',
                    useClass: process.env.MAILGUN_APIKEY
                        ? MailgunService
                        : process.env.SENDINBLUE_APIKEY && process.env.SENDINBLUE_APIKEY.length > 10
                          ? SendInBlueService
                          : MockEmailService
                },
                {
                    provide: 'SMSService',
                    useClass: process.env.TWILIO_SID
                        ? TwilioService
                        : process.env.SENDINBLUE_APIKEY && process.env.SENDINBLUE_APIKEY.length > 10
                          ? SendInBlueService
                          : MockEmailService
                }
            ],
            exports: ['EmailService', 'SMSService']
        };
    }
}
