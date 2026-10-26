import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolImpactReportTable1732017942718 implements MigrationInterface {
    name = 'AddSchoolImpactReportTable1732017942718';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "lwp_school_impact_report" ("id" BIGSERIAL NOT NULL, "isPublished" boolean NOT NULL DEFAULT false, "launchDate" date, "activeFamiliesPercentage" integer, "activePremiumFamiliesPercentage" integer, "activeFamiliesPercentageAllSchools" integer, "activePremiumFamiliesPercentageAllSchools" integer, "numberOfWeeks" integer, "weeklyReadingTarget" integer, "numberOfClasses" integer, "reportType" character varying NOT NULL, "yearGroupCoverage" character varying, "spmNote" character varying, "spmNextStepsProgram" character varying, "logCreatedAt" TIMESTAMP DEFAULT ('now'::text)::timestamp(6) with time zone, "logUpdatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "periodIndex" integer, "schoolId" bigint, "logCreatedById" bigint, "logUpdatedById" bigint, CONSTRAINT "PK_fb99a3c20df0e251c633ff8b396" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`CREATE INDEX "IDX_2ef3f597a486dbcfe7c1c6942f" ON "lwp_school_impact_report" ("logCreatedById") `);
        await queryRunner.query(`CREATE INDEX "IDX_8f09deee8e720e55e9e9fee9a2" ON "lwp_school_impact_report" ("logUpdatedById") `);
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report" ADD CONSTRAINT "FK_98a4fb18d2cbec5e9749ae7a8b4" FOREIGN KEY ("periodIndex") REFERENCES "static_lwp_period"("index") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report" ADD CONSTRAINT "FK_69c777042c2edaa3404c9804b38" FOREIGN KEY ("schoolId") REFERENCES "lwp_school"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report" ADD CONSTRAINT "FK_2ef3f597a486dbcfe7c1c6942f9" FOREIGN KEY ("logCreatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "lwp_school_impact_report" ADD CONSTRAINT "FK_8f09deee8e720e55e9e9fee9a2c" FOREIGN KEY ("logUpdatedById") REFERENCES "lwp_user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP CONSTRAINT "FK_8f09deee8e720e55e9e9fee9a2c"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP CONSTRAINT "FK_2ef3f597a486dbcfe7c1c6942f9"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP CONSTRAINT "FK_69c777042c2edaa3404c9804b38"`);
        await queryRunner.query(`ALTER TABLE "lwp_school_impact_report" DROP CONSTRAINT "FK_98a4fb18d2cbec5e9749ae7a8b4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f09deee8e720e55e9e9fee9a2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ef3f597a486dbcfe7c1c6942f"`);
        await queryRunner.query(`DROP TABLE "lwp_school_impact_report"`);
    }
}
