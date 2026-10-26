import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDataIntoLwpEmailTemplate1706508185760 implements MigrationInterface {
    name = 'MigrateDataIntoLwpEmailTemplate1706508185760';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `
                WITH backup_emailTemplate_schoolId_emailContent_smsContent AS (
                    SELECT 
                        "emailContent", "emailTemplateType", "smsContent", "schoolId"
                    FROM 
                        "backup_emailTemplate_schoolId_emailContent_smsContent"
                ),
                backup_data AS (
                    SELECT 
                        b."emailTemplateType",
                        b."emailContent",
                        b."smsContent",
                        s.id AS "staticTemplateId"
                    FROM 
                        backup_emailTemplate_schoolId_emailContent_smsContent b
                    JOIN 
                        static_lwp_email_template s ON s.type = b."emailTemplateType" AND (s."schoolId" = b."schoolId" OR (s."schoolId" IS NULL AND b."schoolId" IS NULL))
                )
                INSERT INTO lwp_email_template ("sendEmail", "emailOption", heading, "bodyText", "linkText", link, "wholeEmailContent", "multipleSection", "multipleSectionContent", "sendSms", "smsContent", "sendPhoneNotification", "notificationTitle", "notificationDescription", "notificationUrl", "scheduleSmsOption", "scheduleSmsDateTime", status, "emailTemplateId")
                SELECT 
                    ("emailContent" IS NOT NULL),
                    'HTML',
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    "emailContent",
                    false,
                    NULL,
                    ("smsContent" IS NOT NULL),
                    "smsContent",
                    false,
                    NULL,
                    NULL,
                    NULL,
                    'NOW',
                    NULL,
                    'CURRENT',
                    "staticTemplateId"
                FROM 
                    backup_data;
        `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            TRUNCATE TABLE lwp_email_template;
        `);
    }
}
