import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsSchoolFactAndPopulateFunction1774958875243 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS pg_cron;
        `);

        // Create analytics_school_fact table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS analytics_school_fact (
                "schoolId" INTEGER NOT NULL,
                "subjectId" INTEGER NOT NULL,
                "timeKey" integer NOT NULL,
                "region" VARCHAR(255),
                "subject" VARCHAR(255) NOT NULL,
                "numberOfClasses" INTEGER NOT NULL DEFAULT 0,
                "isSignedUp" BOOLEAN NOT NULL DEFAULT FALSE,
                "isOffered" BOOLEAN NOT NULL DEFAULT FALSE,
                "isReleased" BOOLEAN NOT NULL DEFAULT FALSE,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("schoolId", "subjectId", "timeKey")
            );
        `);

        await queryRunner.query(`
            CREATE INDEX idx_analytics_school_fact_schoolId ON analytics_school_fact ("schoolId");
        `);

        await queryRunner.query(`
            CREATE INDEX idx_analytics_school_fact_timeKey ON analytics_school_fact("timeKey");
        `);

        await queryRunner.query(`
            CREATE INDEX idx_analytics_school_fact_subjectId ON analytics_school_fact("subjectId");
        `);

        // Create the upsert function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION upsert_school_fact()
            RETURNS void AS $$
            BEGIN
                -- Insert for each school/subject
                INSERT INTO analytics_school_fact (
                    "schoolId",
                    "subjectId",
                    "subject",
                    "region",
                    "timeKey"
                )
                select 
                    ls.id as "schoolId",
                    sls.id as "subjectId",
                    sls.name as "subject",
                    ls.region as "region",
                    slp.index as "timeKey"
                from lwp_school ls
                join static_lwp_period slp on slp."isCurrentPeriod" = true
                cross join (
                    select id, name from static_lwp_subject
                    union all
                    select 0 as id, 'Reading' as name
                ) sls
                where 
                    not ls.inactive
                    and not ls."isTestSchool"
                ON CONFLICT ("schoolId", "subjectId", "timeKey")
                DO UPDATE SET
                    "subject" = EXCLUDED."subject",
                    "region" = EXCLUDED."region",
                    "updatedAt" = CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Schedule the function to run at 4:30 AM daily
        await queryRunner.query(`
            SELECT cron.schedule(
                'clean-up-and-insert-school-fact-job-430am',
                '30 4 * * *',
                $$ SELECT upsert_school_fact(); $$
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            SELECT cron.unschedule('clean-up-and-insert-school-fact-job-430am');
        `);
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS upsert_school_fact;
        `);
        await queryRunner.query(`
            DROP TABLE IF EXISTS analytics_school_fact;
        `);
    }
}
