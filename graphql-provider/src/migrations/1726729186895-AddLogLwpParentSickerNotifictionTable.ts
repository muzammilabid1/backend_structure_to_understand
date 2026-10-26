import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogLwpParentSickerNotifictionTable1726729186895 implements MigrationInterface {
    name = 'AddLogLwpParentSickerNotifictionTable1726729186895';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "log_lwp_parent_sticker_notification" ("id" BIGSERIAL NOT NULL, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "stickerId" bigint, "userId" bigint, CONSTRAINT "PK_71b7d7359becf715949971f45cc" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "log_lwp_parent_sticker_notification" ADD CONSTRAINT "FK_031e3ba6a0151aef9e36d2f0f5f" FOREIGN KEY ("stickerId") REFERENCES "lwp_sticker"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "log_lwp_parent_sticker_notification" ADD CONSTRAINT "FK_401c331a16a22f0ffbab1210bc0" FOREIGN KEY ("userId") REFERENCES "lwp_user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "log_lwp_parent_sticker_notification" ADD "feedbackId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "log_lwp_parent_sticker_notification" ADD CONSTRAINT "FK_da7bc4fd8a81140ce3864938572" FOREIGN KEY ("feedbackId") REFERENCES "lwp_pupil_feedback"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );

        await queryRunner.query(`
            INSERT INTO log_lwp_parent_sticker_notification ("feedbackId", "userId", "stickerId")
            SELECT 
                MIN(lpf.id) AS "feedbackId", 
                lpf."userId", 
                lfr."stickerId"
            FROM 
                lwp_pupil_feedback lpf
            JOIN 
                lwp_feedback_reply lfr 
                ON lfr."feedbackId" = lpf.id 
                AND lfr."stickerId" IS NOT NULL 
                AND lfr."parentNotified" = TRUE
            WHERE 
                lpf."userType" = 'PARENT'
            GROUP BY 
                lpf."userId", lfr."stickerId";
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "log_lwp_parent_sticker_notification" DROP CONSTRAINT "FK_da7bc4fd8a81140ce3864938572"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_parent_sticker_notification" DROP CONSTRAINT "FK_401c331a16a22f0ffbab1210bc0"`);
        await queryRunner.query(`ALTER TABLE "log_lwp_parent_sticker_notification" DROP CONSTRAINT "FK_031e3ba6a0151aef9e36d2f0f5f"`);
        await queryRunner.query(`DROP TABLE "log_lwp_parent_sticker_notification"`);
    }
}
