import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSchoolAnalyticsFactFunction1778773808177 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'clean-up-and-insert-school-fact-job-430am';
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION upsert_school_fact()
            RETURNS void AS $$
            BEGIN
                with constants AS (
                    SELECT 
                        slp.index as time_key
                    FROM
                        static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                ),
                school_subject as (
                    select
                        ls.id as "schoolId",
                        ls."isMoneySkillsAvailable" as "isMoneySkillsAvailable",
                        ls.region as "region",
                        ls."numOfFullProgrammeClassesAllowed" as "numOfFullProgrammeClassesAllowed",
                        ls."numOfTotalClassesAllowed" as "numOfTotalClassesAllowed",
                        ls."isReadyTeddyAvailable" as "isReadyTeddyAvailable",
                        sls.id as "subjectId",
                        sls.name as "subject",
                        sls."programmeType" as "programmeType",
                        c.time_key as "timeKey"
                    from lwp_school ls
                    join constants c on c.time_key = ls."curentPeriodIndex"
                    cross join (
                        select id, name, "programmeType" from static_lwp_subject
                        union all
                        select 0 as id, 'Reading', 'READING' as name
                    ) sls
                    where 
                        not ls.inactive
                        and not ls."isTestSchool"
                ),
                -- isSignedUp: true if the school has at least one active registration class
                -- with the programme enabled for that subject, regardless of whether any
                -- topic has been released yet.
                sign_up_per_school as (
                    select
                        ss."schoolId",
                        ss."subjectId",
                        bool_or(
                            (ss."programmeType" = 'READING'        AND lsc."IsReadingLogsEnabled" = true)
                            OR (ss."programmeType" = 'READY_TEDDY'    AND lsc."isReadyTeddyEnabled" = true)
                            OR (ss."programmeType" = 'FULL_PROGRAMME' AND lsc."isFullProgramme" = true)
                            OR (ss."programmeType" = 'MONEY_SKILLS'   AND ss."isMoneySkillsAvailable" = true
                                AND (lsc."isFullProgramme" = true OR lsc."IsReadingLogsEnabled" = true))
                        ) AS "isSignedUp"
                    from school_subject ss
                    join lwp_school_class lsc on
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc."isRegistrationClass" = true
                        and lsc.status = 'ACTIVE'
                    GROUP BY ss."schoolId", ss."subjectId"
                ),
                -- numberOfClasses: count of active registration classes that have at least
                -- one topic released for that subject, either directly on the class or on
                -- one of its class groups.
                class_counts_per_school as (
                    select
                        ss."schoolId",
                        CASE WHEN slt."isReading" = true THEN 0 ELSE sls.id END AS "subjectId",
                        COUNT(DISTINCT lsc.id) AS "classCount"
                    from school_subject ss
                    join lwp_school_class lsc on
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc."isRegistrationClass" = true
                        and lsc.status = 'ACTIVE'
                    left join lwp_school_class grp on
                        grp."parentClassId" = lsc.id
                    join lwp_class_topic lct on lct."classId" IN (lsc.id, grp.id) and lct.released = true
                    join static_lwp_topic slt on slt.id = lct."topicId"
                    left join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId"
                    left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                    left join static_lwp_subject sls on sltd."subjectId" = sls."id"
                    GROUP BY ss."schoolId",
                             CASE WHEN slt."isReading" = true THEN 0 ELSE sls.id END
                ),
                
                -- isReleased: true if at least one topic for that subject has been released
                -- in any active class of the school for the current period.
                topics_released_per_subject as (
                    select 
                        ss."schoolId",
                        ss."subjectId",
                        bool_or(
                            CASE
                                WHEN ss."subjectId" = 0 THEN slt."isReading" = true
                                WHEN ss."subjectId" <> 0 THEN ss."subjectId" = sls.id
                            END
                        ) AS "isReleasedTopic"
                    from school_subject ss
                    join lwp_school_class lsc on 
                        lsc."schoolId" = ss."schoolId"
                        and lsc."periodIndex" >= ss."timeKey"
                        and lsc.status = 'ACTIVE'
                    join lwp_class_topic lct on lct."classId" = lsc.id and lct.released = true
                    join static_lwp_topic slt on slt.id = lct."topicId"
                    left join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId"
                    left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
                    left join static_lwp_subject sls on sltd."subjectId" = sls."id"
                    GROUP BY ss."schoolId", ss."subjectId"
                )
                INSERT INTO analytics_school_fact (
                    "schoolId",
                    "subjectId",
                    "subject",
                    "region",
                    "timeKey",
                    "isOffered",
                    "isSignedUp",
                    "numberOfClasses",
                    "isReleased"
                )
                SELECT
                    ss."schoolId",
                    ss."subjectId",
                    ss.subject,
                    ss.region,
                    ss."timeKey",
                    CASE
                        WHEN ss."programmeType" = 'READING'      THEN ss."numOfTotalClassesAllowed" > 0
                        WHEN ss."programmeType" = 'READY_TEDDY'  THEN ss."isReadyTeddyAvailable"
                        WHEN ss."programmeType" = 'FULL_PROGRAMME' THEN ss."numOfFullProgrammeClassesAllowed" > 0
                        WHEN ss."programmeType" = 'MONEY_SKILLS'  THEN ss."isMoneySkillsAvailable"
                    END AS "isOffered",
                    coalesce(sups."isSignedUp", false) AS "isSignedUp",
                    coalesce(ccps."classCount", 0)      AS "numberOfClasses",
                    coalesce(trps."isReleasedTopic", false) AS "isReleased"
                FROM school_subject ss
                left join sign_up_per_school sups on sups."schoolId" = ss."schoolId" and sups."subjectId" = ss."subjectId"
                left join class_counts_per_school ccps on ccps."schoolId" = ss."schoolId" and ccps."subjectId" = ss."subjectId"
                left join topics_released_per_subject trps on trps."schoolId" = ss."schoolId" and trps."subjectId" = ss."subjectId"
                ON CONFLICT ("schoolId", "subjectId", "timeKey")
                DO UPDATE SET
                    "subject"               = EXCLUDED."subject",
                    "region"                = EXCLUDED."region",
                    "numberOfClasses"       = EXCLUDED."numberOfClasses",
                    "isOffered"             = EXCLUDED."isOffered",
                    "isSignedUp"            = EXCLUDED."isSignedUp",
                    "isReleased"            = EXCLUDED."isReleased",
                    "updatedAt"             = CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Schedule the function to run at 4:30 AM daily
        await queryRunner.query(`
            SELECT cron.schedule(
                'upsert_school_fact_job_430am',
                '30 4 * * *',
                $$ SELECT upsert_school_fact(); $$
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Unschedule the new cron job (safe: no-op if not present)
        await queryRunner.query(`
            SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'upsert_school_fact_job_430am';
        `);

        // Restore the previous function body (from migration 1774958875243)
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

        // Re-schedule the old cron job (unschedule first to make it idempotent)
        await queryRunner.query(`
            SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'clean-up-and-insert-school-fact-job-430am';
        `);
        await queryRunner.query(`
            SELECT cron.schedule(
                'clean-up-and-insert-school-fact-job-430am',
                '30 4 * * *',
                $$ SELECT upsert_school_fact(); $$
            );
        `);
    }
}
