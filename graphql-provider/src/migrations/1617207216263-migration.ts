import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1617207216263 implements MigrationInterface {
    name = 'migration1617207216263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "log_lwp_login" ("browser" character varying NOT NULL, "ipAddress" character varying NOT NULL, "userEmail" character varying, "userPhoneNumber" character varying, "result" character varying NOT NULL DEFAULT 'ERROR', "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP(6), "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_06f0e8b20e173de1dacaf9650d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "emailVerificationCode" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "phoneVerificationCode" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "missingCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "registerCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "activeCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "isStatsNeedUpdate" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "logLastActivityCompleted" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "pupilStatus" character varying NOT NULL DEFAULT 'REGISTERED'`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_year_group"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_year_group"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_class_topic"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_class_topic"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_topic"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_topic"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic_domain"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic_domain"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_contact"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_contact"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_faq"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_faq"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_news"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_news"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_parameter"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_parameter"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_resource"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_resource"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" ADD CONSTRAINT "FK_83d1c00dfdc48d84c33e862edc3" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" ADD CONSTRAINT "FK_a172104833df082551831cdc3ee" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_lwp_login" DROP CONSTRAINT "FK_a172104833df082551831cdc3ee"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_login" DROP CONSTRAINT "FK_83d1c00dfdc48d84c33e862edc3"`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_resource"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_resource"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_parameter"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_parameter"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_news"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_news"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_faq"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_faq"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_contact"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_contact"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic_domain"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_topic_domain"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_topic"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_topic"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_class_topic"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_class_topic"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_year_group"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "static_lwp_year_group"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "pupilStatus"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "logLastActivityCompleted"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "isStatsNeedUpdate"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "activeCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "registerCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "missingCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "phoneVerificationCode"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "emailVerificationCode"`);
        await queryRunner.query(`DROP TABLE "log_lwp_login"`);
    }

}
