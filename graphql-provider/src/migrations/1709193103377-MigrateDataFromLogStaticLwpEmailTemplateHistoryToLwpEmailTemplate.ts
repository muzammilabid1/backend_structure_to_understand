/* eslint-disable */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDataFromLogStaticLwpEmailTemplateHistoryToLwpEmailTemplate1709193103377 implements MigrationInterface {
    name = 'MigrateDataFromLogStaticLwpEmailTemplateHistoryToLwpEmailTemplate1709193103377';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            WITH log_static_lwp_email_template_history_to_migrate AS (
                SELECT slet.id as "staticTemplateId", lsleth.email as "emailContent", lsleth.sms as "smsContent"
                FROM static_lwp_email_template slet
                JOIN log_static_lwp_email_template_history lsleth ON 	
                    (lsleth."type" = slet."type")
                AND (
                    (lsleth."schoolId" = slet."schoolId")
                OR (lsleth."schoolId" IS NULL AND slet."schoolId" IS NULL)
                )
            )
            INSERT INTO LWP_EMAIL_TEMPLATE ("sendEmail",
                                            "emailOption",
                                            HEADING,
                                            "bodyText",
                                            "linkText",
                                            LINK,
                                            "wholeEmailContent",
                                            "multipleSection",
                                            "multipleSectionContent",
                                            "sendSms",
                                            "smsContent",
                                            "sendPhoneNotification",
                                            "notificationTitle",
                                            "notificationDescription",
                                            "notificationUrl",
                                            "scheduleSmsOption",
                                            "scheduleSmsDateTime",
                                            STATUS,
                                            "emailTemplateId")
            SELECT ("emailContent" IS NOT NULL), 'HTML',
                NULL,
                NULL,
                NULL,
                NULL,
                "emailContent",
                FALSE,
                NULL, ("smsContent" IS NOT NULL), "smsContent",
                FALSE,
                NULL,
                NULL,
                NULL,
                'NOW',
                NULL,
                'HISTORIC',
                "staticTemplateId"
            FROM log_static_lwp_email_template_history_to_migrate;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
