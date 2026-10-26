import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStartAndEndDateToStaticLwpPeriod1725321844894 implements MigrationInterface {
    name = 'AddStartAndEndDateToStaticLwpPeriod1725321844894';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD "startDate" date`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" ADD "endDate" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP COLUMN "endDate"`);
        await queryRunner.query(`ALTER TABLE "static_lwp_period" DROP COLUMN "startDate"`);
    }
}
