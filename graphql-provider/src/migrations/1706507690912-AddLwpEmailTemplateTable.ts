import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpEmailTemplateTable1706507690912 implements MigrationInterface {
    name = 'AddLwpEmailTemplateTable1706507690912';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "backup_emailTemplate_schoolId_emailContent_smsContent" AS (
                SELECT 
                    "type" AS "emailTemplateType",
                    "email" AS "emailContent",
                    "sms" AS "smsContent",
                    "schoolId" AS "schoolId"
                FROM 
                    static_lwp_email_template
            )
        `);
        await queryRunner.query(
            `CREATE TABLE "lwp_email_template" ("sendEmail" boolean NOT NULL DEFAULT true, "emailOption" character varying NOT NULL DEFAULT 'LAYOUT', "heading" character varying, "bodyText" character varying, "linkText" character varying, "link" character varying, "wholeEmailContent" character varying, "multipleSection" boolean NOT NULL DEFAULT false, "multipleSectionContent" character varying, "sendSms" boolean NOT NULL DEFAULT false, "smsContent" character varying, "sendPhoneNotification" boolean NOT NULL DEFAULT false, "notificationTitle" character varying, "notificationDescription" character varying, "notificationUrl" character varying, "scheduleSmsOption" character varying NOT NULL DEFAULT 'NOW', "scheduleSmsDateTime" TIMESTAMP, "status" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "emailTemplateId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_d923cb45e38e84e195f95114a3d" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_e8faf28491416c452bf9167d84" ON "lwp_email_template" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_f3420b55b946428dd93fdded25" ON "lwp_email_template" ("logUpdatedById") `);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "sms"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "previewLine" character varying`);
        await queryRunner.query(
            `ALTER TABLE "lwp_email_template" ADD CONSTRAINT "FK_b68573588c2fcdf2fcf74177a30" FOREIGN KEY ("emailTemplateId") REFERENCES "static_lwp_email_template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_email_template" ADD CONSTRAINT "FK_e8faf28491416c452bf9167d845" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_email_template" ADD CONSTRAINT "FK_f3420b55b946428dd93fdded258" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "FK_f3420b55b946428dd93fdded258"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "FK_e8faf28491416c452bf9167d845"`);
        await queryRunner.query(`ALTER TABLE "lwp_email_template" DROP CONSTRAINT "FK_b68573588c2fcdf2fcf74177a30"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP COLUMN "previewLine"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "sms" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD "email" character varying`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3420b55b946428dd93fdded25"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8faf28491416c452bf9167d84"`);
        await queryRunner.query(`DROP TABLE "lwp_email_template"`);
    }
}
