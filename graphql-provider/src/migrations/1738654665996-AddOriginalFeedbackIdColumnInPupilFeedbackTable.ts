import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalFeedbackIdColumnInPupilFeedbackTable1738654665996 implements MigrationInterface {
    name = 'AddOriginalFeedbackIdColumnInPupilFeedbackTable1738654665996';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "entryDeletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "originalFeedbackId" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "originalFeedbackId"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "entryDeletedAt"`);
    }
}
