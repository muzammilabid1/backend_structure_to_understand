import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1612774666388 implements MigrationInterface {
    name = 'migration1612774666388'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ADD "mathscotThemes" jsonb DEFAULT '[]'`);
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
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" DROP COLUMN "mathscotThemes"`);
    }

}
