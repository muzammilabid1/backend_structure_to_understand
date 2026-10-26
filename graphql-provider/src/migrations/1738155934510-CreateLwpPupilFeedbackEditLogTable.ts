import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLwpPupilFeedbackEditLogTableAndAddTriggerForLwpPupilFeedbackEditLog1738155934510 implements MigrationInterface {
    name = 'CreateLwpPupilFeedbackEditLogTableAndAddTriggerForLwpPupilFeedbackEditLog1738155934510';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_pupil_feedback_edit_log" ("id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "feedbackId" bigint, "logCreatedById" bigint, CONSTRAINT "PK_bf9bfd3be97cd2b1ad78fa2aa86" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback_edit_log" ADD CONSTRAINT "FK_778cd0bf9a5918ebeccd79da7bd" FOREIGN KEY ("feedbackId") REFERENCES "lwp_pupil_feedback"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback_edit_log" ADD CONSTRAINT "FK_7e01a08468e5fb8d5bd5f6ed9f9" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        await queryRunner.query(`CREATE INDEX "IDX_778cd0bf9a5918ebeccd79da7b" ON "lwp_pupil_feedback_edit_log" ("feedbackId") `);

        await queryRunner.query(`
            INSERT INTO lwp_pupil_feedback_edit_log ("feedbackId", "logCreatedById", "logCreatedAt")
            SELECT
                id AS feedbackId,
                "logUpdatedById" AS logCreatedById,
                "logUpdatedAt" AS logCreatedAt
            FROM lwp_pupil_feedback
            WHERE
                "logCreatedAt" <> "logUpdatedAt"
                AND EXTRACT(EPOCH FROM "logUpdatedAt") - EXTRACT(EPOCH FROM "logCreatedAt") > 5;
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_778cd0bf9a5918ebeccd79da7b"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_edit_log" DROP CONSTRAINT "FK_7e01a08468e5fb8d5bd5f6ed9f9"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback_edit_log" DROP CONSTRAINT "FK_778cd0bf9a5918ebeccd79da7bd"`);
        await queryRunner.query(`DROP TABLE "lwp_pupil_feedback_edit_log"`);
    }
}
