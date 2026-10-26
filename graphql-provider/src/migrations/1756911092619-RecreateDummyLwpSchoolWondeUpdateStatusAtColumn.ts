import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecreateDummyLwpSchoolWondeUpdateStatusAtColumn1756911092619 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" ADD COLUMN "wondeUpdateStatusAt" TIMESTAMP DEFAULT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school" DROP COLUMN "wondeUpdateStatusAt"`);
    }
}
