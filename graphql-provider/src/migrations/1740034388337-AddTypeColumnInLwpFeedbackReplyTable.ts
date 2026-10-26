import { FeedbackReplyType } from 'lwp-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeColumnInLwpFeedbackReplyTable1740034388337 implements MigrationInterface {
    name = 'AddTypeColumnInLwpFeedbackReplyTable1740034388337';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" ADD "type" character varying`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "tickedAt" TIMESTAMP`);
        await queryRunner.query(`
            UPDATE "lwp_feedback_reply"
            SET "type" = CASE
                WHEN "stickerId" IS NOT NULL THEN '${FeedbackReplyType.STICKER}'
                ELSE '${FeedbackReplyType.REPLY}'
            END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "tickedAt"`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" DROP COLUMN "type"`);
    }
}
