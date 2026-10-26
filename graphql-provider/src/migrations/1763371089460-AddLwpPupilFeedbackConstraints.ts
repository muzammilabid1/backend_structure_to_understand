import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpPupilFeedbackConstraints1763371089460 implements MigrationInterface {
    name = 'AddLwpPupilFeedbackConstraints1763371089460';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            WITH base AS (
                SELECT
                    lpfh.*
                FROM
                    lwp_pupil_feedback lpf
                JOIN
                    lwp_pupil_feedback_history lpfh
                    ON lpf.id = lpfh."lwpPupilFeedbackId"
                WHERE
                    lpf.type = 'READING'
                    AND lpf."readingType" IS NULL
                    AND lpf."originalFeedbackId" IS NULL
                ORDER BY lpf."logCreatedAt" DESC
            )
            DELETE FROM lwp_pupil_feedback lpf 
            WHERE lpf.id IN (
                SELECT "lwpPupilFeedbackId" FROM base
            )
        `);
        await queryRunner.query(`
            UPDATE lwp_pupil_feedback
            SET "bookName" = 'Untitled Book'
            WHERE "originalFeedbackId" IS NULL
            AND "type" = 'READING'
            AND ("bookName" IS NULL OR trim("bookName") = '')
        `);
        await queryRunner.query(`
            UPDATE lwp_pupil_feedback
            SET "userType" = 'PARENT'
            WHERE "originalFeedbackId" IS NULL
            AND "userType" IS NULL
            AND "type" = 'ACTIVITY'
        `);
        await queryRunner.query(`
            UPDATE lwp_pupil_feedback
            SET "userId" = 0
            WHERE "logCreatedById" IS NULL
            AND "userId" IS NULL
            AND "originalFeedbackId" IS NULL
        `);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "type" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "type" SET DEFAULT 'ACTIVITY'`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "CHK_lpf_logcreatedby_or_user_required_for_original" CHECK ("logCreatedById" IS NOT NULL
        OR "userId" IS NOT NULL
        OR "originalFeedbackId" IS NOT NULL)`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "CHK_lpf_bookname_required_for_original_reading" CHECK ("originalFeedbackId" IS NOT NULL 
        OR "type" != 'READING'
        OR ("bookName" IS NOT NULL AND trim("bookName") <> ''))`);
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "CHK_lpf_readingtype_required_for_original_reading" CHECK ("originalFeedbackId" IS NOT NULL OR "type" != 'READING' OR "readingType" IS NOT NULL)`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_pupil_feedback" ADD CONSTRAINT "CHK_lpf_usertype_required_for_original" CHECK ("originalFeedbackId" IS NOT NULL OR "userType" IS NOT NULL)`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "CHK_lpf_usertype_required_for_original"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "CHK_lpf_readingtype_required_for_original_reading"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "CHK_lpf_bookname_required_for_original_reading"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP CONSTRAINT "CHK_lpf_logcreatedby_or_user_required_for_original"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "type" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ALTER COLUMN "type" DROP NOT NULL`);
    }
}
