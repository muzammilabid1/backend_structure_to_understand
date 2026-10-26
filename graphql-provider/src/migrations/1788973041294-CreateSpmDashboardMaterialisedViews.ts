import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nightly-refreshed materialised views holding the per-school aggregates the SPM dashboard
 * Created WITH NO DATA: the first population is left to the 05:00 pg_cron job
 * (or a manual `SELECT refresh_spm_dashboard_views();`).
 * Not registered in `typeorm_metadata` and no `@ViewEntity`,
 * because graphql-provider never reads these views (we use kysley to fetch the data directly)
 * and TypeORM only manages the views it finds in that table.
 */
export class CreateSpmDashboardMaterialisedViews1788973041294 implements MigrationInterface {
    name = 'CreateSpmDashboardMaterialisedViews1788973041294';

    private readonly refreshJobName = 'refresh-spm-dashboard-views-5am';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.createSchoolMetricsView(queryRunner);
        await this.createSchoolClassReadingTargetsView(queryRunner);
        await this.createRefreshFunction(queryRunner);
        await this.scheduleNightlyRefresh(queryRunner);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = '${this.refreshJobName}';`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_spm_dashboard_views();`);
        await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS "lwp_view_spm_school_class_reading_targets";`);
        await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS "lwp_view_spm_school_metrics";`);
    }

    private async createSchoolMetricsView(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE MATERIALIZED VIEW "lwp_view_spm_school_metrics" AS
            WITH live_school AS (
                SELECT ls.id AS "schoolId", ls."curentPeriodIndex" AS "periodIndex"
                FROM lwp_school ls
                WHERE NOT ls.inactive AND NOT ls."isTestSchool"
            ),
            current_class AS (
                SELECT s."schoolId", s."periodIndex", lsc.id AS "classId",
                       lsc."IsReadingLogsEnabled" AS "isReadingLogsEnabled", lsc."readingTarget"
                FROM live_school s
                JOIN lwp_school_class lsc ON lsc."schoolId" = s."schoolId" AND lsc."periodIndex" = s."periodIndex"
                WHERE lsc."isRegistrationClass" = true AND lsc.status = 'ACTIVE'
            ),
            reading_log_class AS (
                SELECT * FROM current_class WHERE "isReadingLogsEnabled" = true
            ),
            previous_reading_log_class AS (
                SELECT s."schoolId", s."periodIndex" - 1 AS "periodIndex", lsc.id AS "classId"
                FROM live_school s
                JOIN lwp_school_class lsc ON lsc."schoolId" = s."schoolId" AND lsc."periodIndex" = s."periodIndex" - 1
                WHERE lsc."isRegistrationClass" = true AND lsc.status = 'ACTIVE' AND lsc."IsReadingLogsEnabled" = true
            ),
            activated_class_count AS (
                SELECT "schoolId", count("classId")::int AS "activatedClassCount"
                FROM current_class
                GROUP BY "schoolId"
            ),
            unconfirmed_parent AS (
                SELECT DISTINCT p."schoolId"
                FROM live_school s
                JOIN lwp_pupil p ON p."schoolId" = s."schoolId"
                JOIN lwp_pupil_parent pp ON pp."pupilId" = p.id
                WHERE pp.status = 'IMPORTED'
            ),
            reading_log_parent_feedback AS (
                SELECT DISTINCT lp."schoolId", lpf.id AS "feedbackId", lpf."logCreatedAt"
                FROM live_school s
                JOIN lwp_pupil lp ON lp."schoolId" = s."schoolId"
                JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                WHERE lpf."userType" = 'PARENT' AND lpf.type = 'READING'
                  AND lpf."originalFeedbackId" IS NULL AND lpf."periodIndex" = s."periodIndex"
            ),
            -- A programme is launched on the date of its 3rd unique parent feedback entry
            reading_log_launch AS (
                SELECT "schoolId", "logCreatedAt" AS "launchDate"
                FROM (
                    SELECT "schoolId", "logCreatedAt",
                           row_number() OVER (PARTITION BY "schoolId" ORDER BY "logCreatedAt") AS rn
                    FROM reading_log_parent_feedback
                ) ranked
                WHERE rn = 3
            ),
            activity_launch AS (
                SELECT "schoolId", "programmeType", "logCreatedAt" AS "launchDate"
                FROM (
                    SELECT lsc."schoolId", lsub."programmeType", lpf."logCreatedAt",
                           row_number() OVER (PARTITION BY lsc."schoolId", lsub."programmeType" ORDER BY lpf."logCreatedAt") AS rn
                    FROM live_school s
                    JOIN lwp_school_class lsc ON lsc."schoolId" = s."schoolId"
                    JOIN lwp_class_topic lct ON lct."classId" = lsc.id
                    JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = lct.id
                    JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
                    JOIN lwp_pupil_feedback lpf ON lpf."activityId" = lpa.id
                    JOIN static_lwp_topic_domain_year_group ldyg ON ldyg."topicId" = lpt."topicId"
                    JOIN static_lwp_topic_domain ld ON ld.id = ldyg."domainId"
                    JOIN static_lwp_subject lsub ON lsub.id = ld."subjectId"
                    WHERE lpf."userType" = 'PARENT' AND lpf.type = 'ACTIVITY'
                      AND lpf."originalFeedbackId" IS NULL
                      -- Platform-wide, a pre-admission class is one whose period is ahead of its school's
                      -- (SchoolClassService.isPreAdmissionClass), and Ready Teddy is the programme taught in those
                      -- classes. Its topics and feedback therefore carry the future period for the whole year the
                      -- parent works in, so every read of pre-admission work compares with >= rather than =.
                      AND (
                          (lsub."programmeType" = 'READY_TEDDY' AND lpf."periodIndex" >= s."periodIndex")
                          OR (lsub."programmeType" <> 'READY_TEDDY' AND lpf."periodIndex" = s."periodIndex")
                      )
                      AND lsub."programmeType" IN ('FULL_PROGRAMME', 'MONEY_SKILLS', 'READY_TEDDY')
                ) ranked
                WHERE rn = 3
            ),
            reading_log_current_term AS (
                SELECT c."schoolId",
                       calculate_percentage(
                           count(DISTINCT lp.id)::int,
                           (count(DISTINCT lp.id) FILTER (WHERE lpt."earnedGoldStar" = true))::int
                       )::int AS "activePercent"
                FROM reading_log_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id AND lpp.status IN ('INVITED', 'ACTIVE')
                JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = c."periodIndex" AND lpt."readingTarget" > 0
                JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId" AND lct.released = true AND lct."readingTarget" > 0
                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
                GROUP BY c."schoolId"
            ),
            reading_log_current_term_comment AS (
                SELECT c."schoolId",
                       calculate_percentage(
                           count(DISTINCT lp.id)::int,
                           (count(DISTINCT lp.id) FILTER (WHERE lpf.id IS NOT NULL))::int
                       )::int AS "activePercent"
                FROM reading_log_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id AND lpp.status IN ('INVITED', 'ACTIVE')
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                     AND lpf.type = 'READING' AND lpf."periodIndex" = c."periodIndex" AND lpf.comment IS NOT NULL
                GROUP BY c."schoolId"
            ),
            reading_log_previous_term_comment AS (
                SELECT c."schoolId",
                       calculate_percentage(
                           count(DISTINCT lp.id)::int,
                           (count(DISTINCT lp.id) FILTER (WHERE lpf.id IS NOT NULL))::int
                       )::int AS "activePercent"
                FROM previous_reading_log_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id AND lpp.status IN ('INVITED', 'ACTIVE')
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                     AND lpf.type = 'READING' AND lpf."periodIndex" = c."periodIndex" AND lpf.comment IS NOT NULL
                GROUP BY c."schoolId"
            ),
            -- Deleted feedback has no userType, so the TEACHER filter excludes it without originalFeedbackId
            teacher_feedback_in_use AS (
                SELECT c."schoolId", count(DISTINCT lpf.id) > 0 AS "isInUse"
                FROM reading_log_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id AND lpp.status IN ('INVITED', 'ACTIVE')
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                     AND lpf.type = 'READING' AND lpf."periodIndex" = c."periodIndex" AND lpf."userType" = 'TEACHER'
                GROUP BY c."schoolId"
            ),
            -- Unlike teacher_feedback_in_use, the dashboard's count does not filter on parent status
            teacher_feedback_count AS (
                SELECT c."schoolId", count(DISTINCT lpf.id)::int AS "teacherFeedbackCount"
                FROM reading_log_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                     AND lpf.type = 'READING' AND lpf."periodIndex" = c."periodIndex" AND lpf."userType" = 'TEACHER'
                GROUP BY c."schoolId"
            ),
            school_reading_target AS (
                SELECT "schoolId", MODE() WITHIN GROUP (ORDER BY "readingTarget") AS "readingTarget"
                FROM reading_log_class
                GROUP BY "schoolId"
            ),
            topics_current_term AS (
                SELECT c."schoolId",
                       calculate_percentage(
                           count(DISTINCT lp.id)::int,
                           (count(DISTINCT lp.id) FILTER (
                               WHERE lpt."earnedGoldStar" = true OR lpt."silverStars" > 0 OR lpt."watchedVideo" = true
                           ))::int
                       )::int AS "activePercent"
                FROM current_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = c."periodIndex"
                JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId" AND lct.released = true
                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
                GROUP BY c."schoolId"
            ),
            activities_current_term AS (
                SELECT c."schoolId",
                       calculate_percentage(
                           count(DISTINCT lp.id)::int,
                           (count(DISTINCT lp.id) FILTER (
                               WHERE lpa."earnedStar" = true OR lpa."logFirstAccessed" IS NOT NULL
                           ))::int
                       )::int AS "activePercent"
                FROM current_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = c."periodIndex"
                JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId" AND lct.released = true
                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
                JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
                GROUP BY c."schoolId"
            ),
            pupil_premium AS (
                SELECT c."schoolId",
                       calculate_percentage(
                           count(DISTINCT lp.id)::int,
                           (count(DISTINCT lp.id) FILTER (WHERE lp."isPremium" = true))::int
                       )::int AS "premiumPercent"
                FROM current_class c
                JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = c."classId"
                JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
                GROUP BY c."schoolId"
            ),
            topics_set_count AS (
                SELECT c."schoolId", count(DISTINCT lct.id)::int AS "topicsSetCount"
                FROM current_class c
                JOIN lwp_class_topic lct ON lct."classId" = c."classId" AND lct.released = true
                JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
                GROUP BY c."schoolId"
            ),
            -- Reading logs carry no place column: teachers log at school, everyone else at home.
            -- A teacher group entry fans out over the history join, so both counts are over distinct ids.
            reading_log_totals AS (
                SELECT s."schoolId",
                       (count(DISTINCT lpf.id) FILTER (WHERE lpf."userType" <> 'TEACHER'))::int AS "atHomeCount",
                       (count(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER'))::int AS "atSchoolCount"
                FROM live_school s
                JOIN lwp_pupil lp ON lp."schoolId" = s."schoolId"
                JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
                JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
                WHERE lpf.type = 'READING' AND lpf."originalFeedbackId" IS NULL AND lpf."periodIndex" = s."periodIndex"
                GROUP BY s."schoolId"
            )
            SELECT s."schoolId",
                   COALESCE(acc."activatedClassCount", 0) AS "activatedClassCount",
                   (up."schoolId" IS NOT NULL) AS "hasUnconfirmedParentDetails",
                   rll."launchDate" AS "readingLogLaunchDate",
                   me."launchDate" AS "mathsEnglishLaunchDate",
                   ms."launchDate" AS "moneySkillsLaunchDate",
                   rt."launchDate" AS "readyTeddyLaunchDate",
                   rlct."activePercent" AS "readingLogCurrentTermActivePercent",
                   rlcc."activePercent" AS "readingLogCurrentTermCommentActivePercent",
                   rlpc."activePercent" AS "readingLogPreviousTermCommentActivePercent",
                   tfu."isInUse" AS "teacherFeedbackInUse",
                   srt."readingTarget" AS "schoolReadingTarget",
                   tct."activePercent" AS "topicsCurrentTermActivePercent",
                   act."activePercent" AS "activitiesCurrentTermActivePercent",
                   pp."premiumPercent" AS "pupilPremiumPercent",
                   tfc."teacherFeedbackCount",
                   tsc."topicsSetCount",
                   COALESCE(rlt."atHomeCount", 0) AS "readingLogAtHomeCount",
                   COALESCE(rlt."atSchoolCount", 0) AS "readingLogAtSchoolCount",
                   now() AS "refreshedAt"
            FROM live_school s
            LEFT JOIN activated_class_count acc ON acc."schoolId" = s."schoolId"
            LEFT JOIN unconfirmed_parent up ON up."schoolId" = s."schoolId"
            LEFT JOIN reading_log_launch rll ON rll."schoolId" = s."schoolId"
            LEFT JOIN activity_launch me ON me."schoolId" = s."schoolId" AND me."programmeType" = 'FULL_PROGRAMME'
            LEFT JOIN activity_launch ms ON ms."schoolId" = s."schoolId" AND ms."programmeType" = 'MONEY_SKILLS'
            LEFT JOIN activity_launch rt ON rt."schoolId" = s."schoolId" AND rt."programmeType" = 'READY_TEDDY'
            LEFT JOIN reading_log_current_term rlct ON rlct."schoolId" = s."schoolId"
            LEFT JOIN reading_log_current_term_comment rlcc ON rlcc."schoolId" = s."schoolId"
            LEFT JOIN reading_log_previous_term_comment rlpc ON rlpc."schoolId" = s."schoolId"
            LEFT JOIN teacher_feedback_in_use tfu ON tfu."schoolId" = s."schoolId"
            LEFT JOIN teacher_feedback_count tfc ON tfc."schoolId" = s."schoolId"
            LEFT JOIN school_reading_target srt ON srt."schoolId" = s."schoolId"
            LEFT JOIN topics_current_term tct ON tct."schoolId" = s."schoolId"
            LEFT JOIN activities_current_term act ON act."schoolId" = s."schoolId"
            LEFT JOIN pupil_premium pp ON pp."schoolId" = s."schoolId"
            LEFT JOIN topics_set_count tsc ON tsc."schoolId" = s."schoolId"
            LEFT JOIN reading_log_totals rlt ON rlt."schoolId" = s."schoolId"
            WITH NO DATA;
        `);
        await queryRunner.query(`ALTER MATERIALIZED VIEW "lwp_view_spm_school_metrics" OWNER TO "lwpUser";`);
        // REFRESH ... CONCURRENTLY needs a unique index
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_view_spm_school_metrics_schoolId_idx" ON "lwp_view_spm_school_metrics" ("schoolId");`
        );
    }

    private async createSchoolClassReadingTargetsView(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE MATERIALIZED VIEW "lwp_view_spm_school_class_reading_targets" AS
            SELECT lsc."schoolId",
                   lsc.id AS "classId",
                   lsc.name AS "className",
                   calculate_percentage(
                       count(DISTINCT lp.id)::int,
                       (count(DISTINCT lp.id) FILTER (WHERE lpt."earnedGoldStar" = true))::int
                   )::int AS "activePercent",
                   now() AS "refreshedAt"
            FROM lwp_school ls
            JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id AND lsc."periodIndex" = ls."curentPeriodIndex"
                 AND lsc."isRegistrationClass" = true AND lsc.status = 'ACTIVE' AND lsc."IsReadingLogsEnabled" = true
            JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
            JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
            JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id AND lpp.status IN ('INVITED', 'ACTIVE')
            JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex" AND lpt."readingTarget" > 0
            JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId" AND lct.released = true AND lct."readingTarget" > 0
            JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = true
            WHERE NOT ls.inactive AND NOT ls."isTestSchool"
            GROUP BY lsc."schoolId", lsc.id, lsc.name
            WITH NO DATA;
        `);
        await queryRunner.query(`ALTER MATERIALIZED VIEW "lwp_view_spm_school_class_reading_targets" OWNER TO "lwpUser";`);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "lwp_view_spm_school_class_reading_targets_classId_idx" ON "lwp_view_spm_school_class_reading_targets" ("classId");`
        );
        await queryRunner.query(
            `CREATE INDEX "lwp_view_spm_school_class_reading_targets_schoolId_idx" ON "lwp_view_spm_school_class_reading_targets" ("schoolId");`
        );
    }

    private async createRefreshFunction(queryRunner: QueryRunner): Promise<void> {
        // CONCURRENTLY is refused on a view that has never been populated, so the first refresh is a plain one
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION refresh_spm_dashboard_views()
            RETURNS void AS $$
            DECLARE
                view_name text;
                is_populated boolean;
            BEGIN
                PERFORM set_config('statement_timeout', '600000', true);

                FOREACH view_name IN ARRAY ARRAY['lwp_view_spm_school_metrics', 'lwp_view_spm_school_class_reading_targets'] LOOP
                    SELECT c.relispopulated INTO is_populated
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = view_name;

                    IF is_populated THEN
                        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY public.%I', view_name);
                    ELSE
                        EXECUTE format('REFRESH MATERIALIZED VIEW public.%I', view_name);
                    END IF;
                END LOOP;
            END;
            $$ LANGUAGE plpgsql;
        `);
    }

    private async scheduleNightlyRefresh(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = '${this.refreshJobName}';`);
        // 05:00 GMT, after the 04:00 pupil-fact and 04:30 school-fact jobs
        await queryRunner.query(`
            SELECT cron.schedule(
                '${this.refreshJobName}',
                '0 5 * * *',
                $$ SELECT refresh_spm_dashboard_views(); $$
            );
        `);
    }
}
