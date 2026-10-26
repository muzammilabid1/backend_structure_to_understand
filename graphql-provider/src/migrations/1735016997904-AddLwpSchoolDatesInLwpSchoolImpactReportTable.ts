import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLwpSchoolDatesInLwpSchoolImpactReportTable1735016997904 implements MigrationInterface {
    name = 'AddLwpSchoolDatesInLwpSchoolImpactReportTable1735016997904';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "termId" bigint`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report" ADD CONSTRAINT "FK_aa25272e2c9b6b21c5d331648fa" FOREIGN KEY ("termId") REFERENCES "lwp_school_dates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP CONSTRAINT "FK_aa25272e2c9b6b21c5d331648fa"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "termId"`);
    }
}
