import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwoColumnsInLwpSchoolImpactReportTable1734897122487 implements MigrationInterface {
    name = 'AddTwoColumnsInLwpSchoolImpactReportTable1734897122487';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "premiumPupilsCount" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "pupilsCount" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "pupilsCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "premiumPupilsCount"`);
    }
}
