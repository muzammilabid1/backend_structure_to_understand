import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1616399892624 implements MigrationInterface {
    name = 'migration1616399892624'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity_feedback" ADD "photoRating" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity_feedback" ADD "mwpMedia" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "isEmailVerified" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "isPhoneVerified" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "mwpTransfer" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD "lastInvitationEmailSent" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "parentLogins" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "commentsAndPhotos" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "activityAccessed" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "mwpTransfer" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "mwpOrder" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" ADD "mwpMathscotItems" json`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" ADD "mwpMathscotItem" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" ADD "mwpTransfer" boolean DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "static_lwp_mathscot_item" ADD "mwpTheme" integer`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."email" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."phoneNumber" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ADD CONSTRAINT "UQ_8fba726d5b4a95a33f6394f3f5e" UNIQUE ("phoneNumber")`);
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP CONSTRAINT "UQ_8fba726d5b4a95a33f6394f3f5e"`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."phoneNumber" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."email" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_user" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "static_lwp_mathscot_item" DROP COLUMN "mwpTheme"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil" DROP COLUMN "mwpTransfer"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_topic" DROP COLUMN "mwpMathscotItem"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "mwpMathscotItems"`);
        await queryRunner.query(`ALTER TABLE "lwp_class_topic" DROP COLUMN "mwpOrder"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "mwpTransfer"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "activityAccessed"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "commentsAndPhotos"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "parentLogins"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "lastInvitationEmailSent"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "mwpTransfer"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "isPhoneVerified"`);
        await queryRunner.query(`ALTER TABLE "lwp_user" DROP COLUMN "isEmailVerified"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity_feedback" DROP COLUMN "mwpMedia"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_activity_feedback" DROP COLUMN "photoRating"`);
    }

}
