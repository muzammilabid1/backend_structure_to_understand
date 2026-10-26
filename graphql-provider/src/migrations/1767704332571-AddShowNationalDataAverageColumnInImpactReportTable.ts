import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowNationalDataAverageColumnInImpactReportTable1767704332571 implements MigrationInterface {
    name = 'AddShowNationalDataAverageColumnInImpactReportTable1767704332571';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "showNationalDataAverage" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "showNationalDataAverage"`);
    }
}
