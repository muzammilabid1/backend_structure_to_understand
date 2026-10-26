import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImpactReportGraphTableAndMigrateData1763449865637 implements MigrationInterface {
    name = 'AddImpactReportGraphTableAndMigrateData1763449865637';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_school_impact_report_graphs" ("id" BIGSERIAL NOT NULL, "premiumPupilsCount" integer, "pupilsCount" integer, "engagementByYearGroup" jsonb, "engagementByClass" jsonb, "avgCompletionRateByYearGroup" jsonb, "avgCompletionRateByClass" jsonb, "avgTopicSetByYearGroup" jsonb, "avgTopicSetByClass" jsonb, "buildingEngagement" jsonb, "impactReportId" bigint, "subjectId" bigint, CONSTRAINT "PK_03e32ae6e68a453c374d73610df" PRIMARY KEY ("id"))`
        );

        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "version" character varying NOT NULL DEFAULT 'VERSION_1'`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ALTER COLUMN "reportType" DROP NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report_graphs" ADD CONSTRAINT "FK_1ef4b700ae7f03254e81c6e9412" FOREIGN KEY ("impactReportId") REFERENCES "lwp_school_impact_report"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report_graphs" ADD CONSTRAINT "FK_5d169f3a9215ebdfa1266133abb" FOREIGN KEY ("subjectId") REFERENCES "static_lwp_subject"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );

        await queryRunner.query(
            `
            WITH base AS (
                SELECT
                    id,
                    "premiumPupilsCount",
                    "pupilsCount",
                    "engagementByYearGroup",
                    "engagementByClass",
                    "avgWeeklyTargetMetByYearGroup",
                    "avgWeeklyTargetMetByClass",
                    "avgTopicSetByYearGroup",
                    "avgTopicSetByClass",
                    "buildingEngagement"
                FROM lwp_school_impact_report
            )
            INSERT INTO lwp_school_impact_report_graphs (
                "impactReportId",
                "engagementByYearGroup",
                "engagementByClass",
                "avgCompletionRateByYearGroup",
                "avgCompletionRateByClass",
                "avgTopicSetByYearGroup",
                "avgTopicSetByClass",
                "buildingEngagement",
                "premiumPupilsCount",
                "pupilsCount"
            )
            SELECT 
                id,
                "engagementByYearGroup",
                "engagementByClass",
                "avgWeeklyTargetMetByYearGroup",
                "avgWeeklyTargetMetByClass",
                "avgTopicSetByYearGroup",
                "avgTopicSetByClass",
                "buildingEngagement",
                "premiumPupilsCount",
                "pupilsCount"
            FROM base;  
        `
        );

        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "engagementByYearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "engagementByClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgWeeklyTargetMetByYearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgWeeklyTargetMetByClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgTopicSetByYearGroup"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "avgTopicSetByClass"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "buildingEngagement"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "premiumPupilsCount"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "pupilsCount"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "pupilsCount" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "premiumPupilsCount" integer`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "buildingEngagement" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgTopicSetByClass" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgTopicSetByYearGroup" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgWeeklyTargetMetByClass" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "avgWeeklyTargetMetByYearGroup" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "engagementByClass" jsonb`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ADD "engagementByYearGroup" jsonb`);

        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report_graphs" DROP CONSTRAINT "FK_5d169f3a9215ebdfa1266133abb"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report_graphs" DROP CONSTRAINT "FK_1ef4b700ae7f03254e81c6e9412"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" ALTER COLUMN "reportType" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP COLUMN "version"`);

        await queryRunner.query(`DROP TABLE "lwp_school_impact_report_graphs"`);
    }
}
