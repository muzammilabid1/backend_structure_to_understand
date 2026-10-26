import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIndexesToLwpPupilFeedbackMediaForeignKey1695202991188 implements MigrationInterface {
    name = 'AddIndexesToLwpPupilFeedbackMediaForeignKey1695202991188'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_a1515e99b330ec6552c4aa7cc3" ON "lwp_pupil_feedback_media" ("feedbackId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_a1515e99b330ec6552c4aa7cc3"`);
    }

}
