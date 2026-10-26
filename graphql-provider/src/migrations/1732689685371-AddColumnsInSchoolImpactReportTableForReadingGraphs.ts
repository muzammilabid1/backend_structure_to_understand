import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnsInSchoolImpactReportTableForReadingGraphs1732689685371 implements MigrationInterface {
    name = 'AddColumnsInSchoolImpactReportTableForReadingGraphs1732689685371';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "engagementByYearGroup" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "engagementByClass" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgWeeklyTargetMetByYearGroup" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgWeeklyTargetMetByClass" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgTopicSetByYearGroup" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgTopicSetByClass" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "buildingEngagement" jsonb`);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION calculate_percentage(total_count INT, matched_count INT)
            RETURNS NUMERIC AS $$
                SELECT CASE 
                    WHEN total_count = 0 THEN 0 
                    ELSE ROUND((matched_count * 100.0 / total_count)) 
                END;
            $$ LANGUAGE SQL IMMUTABLE LEAKPROOF PARALLEL SAFE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP FUNCTION IF EXISTS calculate_percentage;`);

        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "buildingEngagement"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgTopicSetByClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgTopicSetByYearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgWeeklyTargetMetByClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgWeeklyTargetMetByYearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "engagementByClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "engagementByYearGroup"`);
    }
}
