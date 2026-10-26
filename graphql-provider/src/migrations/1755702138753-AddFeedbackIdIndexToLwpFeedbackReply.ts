import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeedbackIdIndexToLwpFeedbackReply1755702138753 implements MigrationInterface {
    name = 'AddFeedbackIdIndexToLwpFeedbackReply1755702138753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_f2292376f78e629b883a794491" ON "lwp_feedback_reply" ("feedbackId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f2292376f78e629b883a794491"`);
    }

}
