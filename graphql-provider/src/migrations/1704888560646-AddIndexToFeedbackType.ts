import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexToFeedbackType1704888560646 implements MigrationInterface {
    name = 'AddIndexToFeedbackType1704888560646'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_ce202155b2a4cbc9c5ea087880" ON "lwp_pupil_feedback" ("type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ce202155b2a4cbc9c5ea087880"`);
    }

}
