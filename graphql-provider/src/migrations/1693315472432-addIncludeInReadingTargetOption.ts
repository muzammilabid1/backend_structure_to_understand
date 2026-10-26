import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIncludeInReadingTargetOption1693315472432 implements MigrationInterface {
    name = 'addIncludeInReadingTargetOption1693315472432';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "includeReadingAtSchoolInTarget"`);
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" ADD "includeInReadingTarget" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_pupil_feedback" DROP COLUMN "includeInReadingTarget"`);
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD "includeReadingAtSchoolInTarget" boolean NOT NULL DEFAULT true`);
    }
}
