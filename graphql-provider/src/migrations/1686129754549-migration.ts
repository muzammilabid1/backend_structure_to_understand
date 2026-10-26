import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1686129754549 implements MigrationInterface {
    name = 'migration1686129754549'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_fb19a6933e884b715b64ab79325"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP CONSTRAINT "FK_cec7d14e1eb10f1327851999766"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" RENAME COLUMN "logEmailSmsId" TO "lwpNotificationId"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" RENAME CONSTRAINT "UQ_fb19a6933e884b715b64ab79325" TO "UQ_d315af31fd70fb8f7232de033d9"`);
        await queryRunner.query(`CREATE TABLE "lwp_notification" ("recipient" character varying, "schoolId" integer, "userId" integer, "sentAt" TIMESTAMP, "notificationType" character varying NOT NULL, "emailTemplateType" character varying NOT NULL, "params" jsonb, "badParams" jsonb DEFAULT '[]', "context" jsonb, "error" jsonb, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_05f00c35dc60d7a6b77d93b9d01" PRIMARY KEY ("id"))`);
	await queryRunner.query(`INSERT INTO "lwp_notification" ("recipient", "sentAt", "notificationType", "emailTemplateType", "params", "badParams", "error", "id", "logCreatedAt") SELECT "recipient", "logCreatedAt", CASE WHEN "recipient" LIKE '+%' THEN 'SMS' ELSE 'EMAIL' END, "messageType", "params", "badParams", "error", "id", "logCreatedAt" from "log_lwp_email_sms"`);
	await queryRunner.query(`SELECT setval('lwp_notification_id_seq', (SELECT MAX(id) FROM lwp_notification) + 1)`);
        await queryRunner.query(`CREATE TABLE "lwp_school_holiday" ("holidayName" character varying NOT NULL, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "released" boolean NOT NULL DEFAULT false, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "deletedAt" TIMESTAMP, "periodIndex" integer, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_4e5b323f5c7d1be8bd60ff2724f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lwp_user_interstitial" ("completed" boolean NOT NULL DEFAULT false, "optedOut" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "userId" bigint, "interstitialId" bigint, "deletedById" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_ef430d168347f0a6ef99bc06686" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lwp_school_holidays" ("lwpSchoolHolidayId" bigint NOT NULL, "lwpSchoolId" bigint NOT NULL, CONSTRAINT "PK_4415fa4b8f02c714880e2c10865" PRIMARY KEY ("lwpSchoolHolidayId", "lwpSchoolId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0984b81f175de9510698bcda08" ON "lwp_school_holidays" ("lwpSchoolHolidayId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6da9024ce11b794ce5ad14a9be" ON "lwp_school_holidays" ("lwpSchoolId") `);
	await queryRunner.query(`INSERT INTO "lwp_user_interstitial" ("userId", "interstitialId") SELECT "id", "showInterstitialId" FROM "lwp_user" WHERE "showInterstitialId" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "showInterstitialId"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_faq" DROP COLUMN "forStaticSite"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "readingStartDay" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "notifyParent" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "privateNote" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "name" character varying`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "averageTime" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "context" jsonb`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD "deletedById" bigint`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD CONSTRAINT "FK_66125e54df0ed1a92e2ec94a302" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" ADD CONSTRAINT "FK_ff7a0ae6a7badcdee63d9e1451f" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_d315af31fd70fb8f7232de033d9" FOREIGN KEY ("lwpNotificationId") REFERENCES "lwp_notification"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" ADD CONSTRAINT "FK_7ba77137c56781fb8f116ad2a45" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" ADD CONSTRAINT "FK_998db88f5b48088826c7ded8953" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" ADD CONSTRAINT "FK_33cd7aa73e0fc074d4d25258827" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" ADD CONSTRAINT "FK_7c62de4d52d33cb7000554ffaab" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" ADD CONSTRAINT "FK_0be2abc8ff1982f258a11fa6545" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" ADD CONSTRAINT "FK_377a44e70b697bc51306a35d084" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" ADD CONSTRAINT "FK_7a804a3c3880408d571c068b07b" FOREIGN KEY ("interstitialId") REFERENCES "static_lwp_interstitial"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" ADD CONSTRAINT "FK_dc74a6d9174f1d33b88e060828e" FOREIGN KEY ("deletedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" ADD CONSTRAINT "FK_d8cc8a8bb88bb96b14479acd922" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" ADD CONSTRAINT "FK_b8244b3c456d9332d0320d2e004" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" ADD CONSTRAINT "FK_0984b81f175de9510698bcda08d" FOREIGN KEY ("lwpSchoolHolidayId") REFERENCES "lwp_school_holiday"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" ADD CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee" FOREIGN KEY ("lwpSchoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" DROP CONSTRAINT "FK_6da9024ce11b794ce5ad14a9bee"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holidays" DROP CONSTRAINT "FK_0984b81f175de9510698bcda08d"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" DROP CONSTRAINT "FK_b8244b3c456d9332d0320d2e004"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" DROP CONSTRAINT "FK_d8cc8a8bb88bb96b14479acd922"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" DROP CONSTRAINT "FK_dc74a6d9174f1d33b88e060828e"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" DROP CONSTRAINT "FK_7a804a3c3880408d571c068b07b"`);
        await queryRunner.query(`ALTER TABLE "lwp_user_interstitial" DROP CONSTRAINT "FK_377a44e70b697bc51306a35d084"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP CONSTRAINT "FK_0be2abc8ff1982f258a11fa6545"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" DROP CONSTRAINT "FK_7c62de4d52d33cb7000554ffaab"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" DROP CONSTRAINT "FK_33cd7aa73e0fc074d4d25258827"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" DROP CONSTRAINT "FK_998db88f5b48088826c7ded8953"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_holiday" DROP CONSTRAINT "FK_7ba77137c56781fb8f116ad2a45"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" DROP CONSTRAINT "FK_d315af31fd70fb8f7232de033d9"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP CONSTRAINT "FK_ff7a0ae6a7badcdee63d9e1451f"`);
        await queryRunner.query(`ALTER TABLE "lwp_notification" DROP CONSTRAINT "FK_66125e54df0ed1a92e2ec94a302"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "deletedById"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "context"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "averageTime"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_interstitial" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "privateNote"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "notifyParent"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "readingStartDay"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_faq" ADD "forStaticSite" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "showInterstitialId" bigint`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6da9024ce11b794ce5ad14a9be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0984b81f175de9510698bcda08"`);
        await queryRunner.query(`DROP TABLE "lwp_school_holidays"`);
        await queryRunner.query(`DROP TABLE "lwp_user_interstitial"`);
        await queryRunner.query(`DROP TABLE "lwp_school_holiday"`);
        await queryRunner.query(`DROP TABLE "lwp_notification"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" RENAME CONSTRAINT "UQ_d315af31fd70fb8f7232de033d9" TO "UQ_fb19a6933e884b715b64ab79325"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" RENAME COLUMN "lwpNotificationId" TO "logEmailSmsId"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD CONSTRAINT "FK_cec7d14e1eb10f1327851999766" FOREIGN KEY ("showInterstitialId") REFERENCES "static_lwp_interstitial"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_email_template" ADD CONSTRAINT "FK_fb19a6933e884b715b64ab79325" FOREIGN KEY ("logEmailSmsId") REFERENCES "log_lwp_email_sms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
