import {MigrationInterface, QueryRunner} from "typeorm";

export class migration1612444805242 implements MigrationInterface {
    name = 'migration1612444805242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "static_lwp_year_group" ("year" character varying NOT NULL, "id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP(6), "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_ba5f69064482be1a268000a0b76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD "yearGroup" bigint`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "yearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "yearGroup" bigint`);
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
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ADD CONSTRAINT "FK_d4cc56a4a584209ccfc183ead10" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" ADD CONSTRAINT "FK_a15ff23b3be6426d4d2d03ad710" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD CONSTRAINT "FK_9712293bbad097999c48154ae62" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" ADD CONSTRAINT "FK_52f3018dcb9c1e9db5e4eff2d84" FOREIGN KEY ("yearGroup") REFERENCES "static_lwp_year_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP CONSTRAINT "FK_52f3018dcb9c1e9db5e4eff2d84"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP CONSTRAINT "FK_9712293bbad097999c48154ae62"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" DROP CONSTRAINT "FK_a15ff23b3be6426d4d2d03ad710"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_year_group" DROP CONSTRAINT "FK_d4cc56a4a584209ccfc183ead10"`);
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
        await queryRunner.query(`ALTER TABLE "lwp_school_class" DROP COLUMN "yearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_class" ADD "yearGroup" character varying NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school_class"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_school"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_user"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity_feedback"."logCreatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logUpdatedAt" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "lwp_pupil_activity"."logCreatedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "static_lwp_topic" DROP COLUMN "yearGroup"`);
        await queryRunner.query(`DROP TABLE "static_lwp_year_group"`);
    }

}
