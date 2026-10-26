import {MigrationInterface, QueryRunner} from "typeorm";

export class MakeFeedbackIndexForRLTRTViewComposite1704892095145 implements MigrationInterface {
    name = 'MakeFeedbackIndexForRLTRTViewComposite1704892095145'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ce202155b2a4cbc9c5ea087880"`);
        await queryRunner.query(`CREATE INDEX "lwp_pupil_feedback_type_id_deleted" ON "lwp_pupil_feedback" ("type", "id", "deletedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."lwp_pupil_feedback_type_id_deleted"`);
        await queryRunner.query(`CREATE INDEX "IDX_ce202155b2a4cbc9c5ea087880" ON "lwp_pupil_feedback" ("type") `);
    }

}
