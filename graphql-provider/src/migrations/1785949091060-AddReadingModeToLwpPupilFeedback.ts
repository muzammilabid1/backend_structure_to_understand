import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReadingModeToLwpPupilFeedback1785949091060 implements MigrationInterface {
    name = 'AddReadingModeToLwpPupilFeedback1785949091060';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "readingMode" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "readingMode"`);
    }
}
