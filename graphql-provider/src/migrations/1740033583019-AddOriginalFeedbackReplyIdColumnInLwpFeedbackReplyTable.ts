import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalFeedbackReplyIdColumnInLwpFeedbackReplyTable1740033583019 implements MigrationInterface {
    name = 'AddOriginalFeedbackReplyIdColumnInLwpFeedbackReplyTable1740033583019';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" ADD "originalFeedbackReplyDeletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" ADD "originalFeedbackReplyId" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" DROP COLUMN "originalFeedbackReplyId"`);
        await queryRunner.query(`ALTER TABLE "lwp_feedback_reply" DROP COLUMN "originalFeedbackReplyDeletedAt"`);
    }
}
