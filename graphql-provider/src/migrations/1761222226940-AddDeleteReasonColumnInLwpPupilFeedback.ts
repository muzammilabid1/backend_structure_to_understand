import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeleteReasonColumnInLwpPupilFeedback1761222226940 implements MigrationInterface {
    name = 'AddDeleteReasonColumnInLwpPupilFeedback1761222226940';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "reasonToDelete" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "reasonToDelete"`);
    }
}
