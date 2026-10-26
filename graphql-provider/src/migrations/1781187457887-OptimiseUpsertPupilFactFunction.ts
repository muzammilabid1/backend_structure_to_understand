import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimiseUpsertPupilFactFunction1781187457887 implements MigrationInterface {
    name = 'OptimiseUpsertPupilFactFunction1781187457887';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'upsert-pupil-fact-job-4am';
        `);

        /**
         * Optimises the upsert_pupil_fact function to improve query performance:
         *
         * 1. student_subject_base replaced logCreatedAt date-range filter with
         *    `lpt."periodIndex" >= c.time_key`. periodIndex is indexed; logCreatedAt
         *    has no index, causing full sequential scans on lwp_pupil_topic.
         *    Also added `NOT ls.inactive` to the school join to exclude inactive schools,
         *    and removed the releaseDate range filter (periodIndex alone is sufficient).
         *
         * 2. completed_activities_by_subject, removed the correlated EXISTS subquery
         *    that checked for a lwp_pupil_feedback record on each activity. earnedStar
         *    is set to true by the application exactly when such a feedback record
         *    exists, so checking earnedStar directly is equivalent and avoids
         *    re-scanning lwp_pupil_feedback once per activity row.
         *
         * 3. star_ratings_by_subject, removed five separate correlated EXISTS subqueries
         *    from the FILTER clauses (one per star rating bucket). Same reasoning as
         *    point 2: earnedStar is set to true by the application exactly when a
         *    lwp_pupil_feedback record exists for that activity, so checking earnedStar
         *    directly is equivalent and avoids repeated subquery overhead per bucket.
         *
         * 4. feedback_metrics_by_subject, replaced `lpf."logCreatedAt" BETWEEN
         *    c.year_start AND c.year_end` with `lpf."periodIndex" >= c.time_key`,
         *    again using the indexed column to avoid a sequential scan on
         *    lwp_pupil_feedback.
         *
         * 5. active_parents_by_student removed `lu."logCreatedAt" <= year_end`
         *    because it incorrectly excluded parents created before the current academic
         *    year. A parent created in a prior year can still be actively linked to a
         *    pupil in the current year, so the constraint was silently under counting
         *    active parents. Also removed 'IMPORTED' from the accepted userStatus
         *    values: if the lwp_pupil_parent link status is 'ACTIVE', the parent user
         *    cannot be IMPORTED.
         *
         * 6. yearly_metrics topics_completed_count previously used a correlated
         *    EXISTS subquery checking whether any lwp_pupil_activity row had
         *    earnedStar = true. Reading topics have no activity records, so that
         *    count was always 0 for them. earnedGoldStar on lwp_pupil_topic is set
         *    to true when at least one activity has earnedStar = true (or the reading
         *    topic is otherwise completed), so checking ssb."earnedGoldStar" directly
         *    correctly counts completed reading topics and removes the subquery.
         *    activities_accessed_count had a redundant logCreatedAt date-range guard
         *    removed: the base CTE already filters to current-year data via
         *    periodIndex, so the extra date condition was duplicating that filter.
         */

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION upsert_pupil_fact()
            RETURNS void AS $$
            BEGIN
                INSERT INTO analytics_pupil_fact (
                    "pupilId",
                    "schoolId",
                    "timeKey",
                    "timeGrain",
                    "subjectId",
                    "isActive",
                    "activitiesSetCount",
                    "activitiesCompletedCount",
                    "activitiesAccessedCount",
                    "topicsSetCount",
                    "topicsCompletedCount",
                    "readingTarget",
                    "videosWatchedCount",
                    "parentCommentsLeftCount",
                    "pupilCommentsLeftCount",
                    "teacherCommentsLeftCount",
                    "parentPhotosUploadedCount",
                    "teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount",
                    "teacherAudioClipsUploadedCount",
                    "starRatingsCount",
                    "sumStarRatings",
                    "oneStarRatingsCount",
                    "twoStarRatingsCount",
                    "threeStarRatingsCount",
                    "fourStarRatingsCount",
                    "fiveStarRatingsCount",
                    "parentFeedbackEntries",
                    "teacherFeedbackEntries",
                    "subject",
                    "isPupilPremium",
                    "gender",
                    "ethnicityCode",
                    "sen",
                    "englishAsAdditionalLanguage",
                    "activeParentsCount"
                )
                WITH
                -- Constants for academic year
                constants AS (
                    SELECT
                        slp.index as time_key
                    FROM
                        static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                ),

                -- Base student-subject CTE (filtered by pupils with topic activity in the academic year)
                student_subject_base AS (
                    SELECT DISTINCT
                        lp.id as student_id,
                        lp."schoolId" as school_id,
                        COALESCE(lp."isPremium", false) as is_pupil_premium,
                        lp.gender,
                        CASE
                            WHEN ws.sen_status IS NULL THEN NULL
                            WHEN ws.sen_status IN ('N', 'N,', '') THEN false
                            ELSE true
                        END as has_sen,
                        ws.ethnicity_code,
                        ws.english_as_additional_language_status,
                        COALESCE(sltd."subjectId", 0) as subject_id,
                        COALESCE(sls.name,
                            CASE
                                WHEN slt."isReading" = true and sls.id is null  THEN 'Reading'
                                WHEN slt."isReading" = false AND sltd."subjectId" IS NULL THEN 'Other'
                                ELSE 'Unknown'
                            END
                        ) as subject_name,
                        lpt.id as pupil_topic_id,
                        lpt."releaseDate",
                        lpt."readingTarget",
                        lpt."watchedVideo",
                        lpt."earnedGoldStar",
                        slt.id as topic_id,
                        sla.id as static_activity_id
                    FROM lwp_pupil lp
                    JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool" AND NOT ls.inactive
                    JOIN constants c on c.time_key = ls."curentPeriodIndex"
                    LEFT JOIN imported_student ws ON ws.id = lp."importedStudentId"
                    JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" >= c.time_key
                    JOIN static_lwp_topic slt ON slt.id = lpt."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = slt.id
                    LEFT JOIN static_lwp_topic_domain sltd ON sltd.id = sltdyg."domainId"
                    LEFT JOIN static_lwp_subject sls ON sls.id = sltd."subjectId"
                    LEFT JOIN static_lwp_activity sla ON sla."topicId" = slt.id
                ),

                -- Completed activities aggregation
                completed_activities_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(DISTINCT lpa.id) as activities_completed_count
                    FROM student_subject_base ssb
                    JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    where lpa."earnedStar" = true
                    GROUP BY ssb.student_id, ssb.subject_id
                ),

                -- Star ratings aggregation
                star_ratings_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(lpa.rating) as total_star_ratings_given,
                        COALESCE(SUM(lpa.rating), 0) as sum_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 1) as one_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 2) as two_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 3) as three_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 4) as four_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 5) as five_star_ratings
                    FROM student_subject_base ssb
                    JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    WHERE
                        lpa.rating IS NOT NULL
                        AND lpa."earnedStar" = true
                    GROUP BY ssb.student_id, ssb.subject_id
                ),
				student_subjects AS (
				    SELECT DISTINCT student_id, subject_id
				    FROM student_subject_base
				),
                -- Feedback metrics aggregation
                feedback_metrics_by_subject AS (
                    SELECT
                        ss.student_id,
                        ss.subject_id,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT'
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_parents_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PUPIL'
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_pupils_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER' AND lpf."comment" IS NOT NULL
                        ) as comments_left_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'PARENT') as photos_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'TEACHER') as photos_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'PARENT') as audio_clips_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'TEACHER') as audio_clips_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT') as parent_feedback_entries,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER') as teacher_feedback_entries
                    FROM student_subjects ss
                    LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = ss.student_id
                    LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId" and lpf."originalFeedbackId" IS NULL
                    LEFT JOIN lwp_pupil_feedback_media lpfm ON lpfm."feedbackId" = lpf.id
                    LEFT JOIN lwp_pupil_activity lpa ON lpf."activityId" = lpa.id
                    LEFT JOIN lwp_pupil_topic lpt_feedback ON lpa."topicId" = lpt_feedback.id
                    LEFT JOIN static_lwp_topic slt_feedback ON slt_feedback.id = lpt_feedback."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg_feedback ON sltdyg_feedback."topicId" = slt_feedback.id
                    LEFT JOIN static_lwp_topic_domain sltd_feedback ON sltd_feedback.id = sltdyg_feedback."domainId"
                    CROSS JOIN constants c
                    WHERE lpf."periodIndex" >= c.time_key
                        AND (sltd_feedback."subjectId" = ss.subject_id OR sltd_feedback."subjectId" IS NULL)
                    GROUP BY ss.student_id, ss.subject_id
                ),

                -- Active parents aggregation
                active_parents_by_student AS (
                    SELECT
                        ssb.student_id,
                        COUNT(DISTINCT lpp."parentId") FILTER (WHERE
                            lpp.status = 'ACTIVE'
                            AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS')
                        ) as active_parents_count
                    FROM student_subject_base ssb
                    LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = ssb.student_id
                    LEFT JOIN lwp_user lu ON lu.id = lpp."parentId" AND lu.type = 'PARENT'
                    GROUP BY ssb.student_id
                ),

                -- Main yearly metrics aggregation
                yearly_metrics AS (
                    SELECT
                        c.time_key,
                        ssb.student_id,
                        ssb.school_id,
                        ssb.subject_id,
                        ssb.subject_name,
                        ssb.is_pupil_premium,
                        ssb.gender,
                        ssb.ethnicity_code,
                        ssb.has_sen,
                        ssb.english_as_additional_language_status,

                        -- Direct aggregations from base CTE
                        COUNT(DISTINCT ssb.static_activity_id) as activities_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) as topics_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."watchedVideo" = true) as videos_watched_count,

                        -- Activity access and completion
                        COUNT(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar" = true or lpa."logAccessedOnMobile" <> 0 or lpa."logAccessedOnDesktop" <> 0) as activities_accessed_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."earnedGoldStar") as topics_completed_count,

                        -- Reading target sum
                        COALESCE(SUM(ssb."readingTarget"), 0) as reading_target_sum
                    FROM student_subject_base ssb
                    CROSS JOIN constants c
                    LEFT JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    GROUP BY c.time_key, ssb.student_id, ssb.school_id, ssb.subject_id, ssb.subject_name,
                            ssb.is_pupil_premium, ssb.gender, ssb.ethnicity_code, ssb.has_sen, ssb.english_as_additional_language_status
                )

                -- Final SELECT with all analytics metrics
                SELECT
                    ym.student_id as "pupilId",
                    ym.school_id as "schoolId",
                    ym.time_key as "timeKey",
                    -- Time grain (always yearly for this extraction)
                    'yearly' as "timeGrain",
                    ym.subject_id as "subjectId",
                    (ym.activities_set_count > 0 OR ym.activities_accessed_count > 0) as "isActive",
                    -- Activity metrics
                    ym.activities_set_count as "activitiesSetCount",
                    COALESCE(cabs.activities_completed_count, 0) as "activitiesCompletedCount",
                    ym.activities_accessed_count as "activitiesAccessedCount",
                    ym.topics_set_count as "topicsSetCount",
                    ym.topics_completed_count as "topicsCompletedCount",
                    ym.reading_target_sum as "readingTarget",
                    ym.videos_watched_count as "videosWatchedCount",
                    -- Feedback metrics
                    COALESCE(fmbs.comments_left_by_parents_count, 0) as "parentCommentsLeftCount",
                    COALESCE(fmbs.comments_left_by_pupils_count, 0) as "pupilCommentsLeftCount",
                    COALESCE(fmbs.comments_left_by_teachers_count, 0) as "teacherCommentsLeftCount",
                    COALESCE(fmbs.photos_uploaded_by_parents_count, 0) as "parentPhotosUploadedCount",
                    COALESCE(fmbs.photos_uploaded_by_teachers_count, 0) as "teacherPhotosUploadedCount",
                    COALESCE(fmbs.audio_clips_uploaded_by_parents_count, 0) as "parentAudioClipsUploadedCount",
                    COALESCE(fmbs.audio_clips_uploaded_by_teachers_count, 0) as "teacherAudioClipsUploadedCount",
                    -- Star ratings
                    COALESCE(srbs.total_star_ratings_given, 0) as "starRatingsCount",
                    COALESCE(srbs.sum_star_ratings, 0) as "sumStarRatings",
                    COALESCE(srbs.one_star_ratings, 0) as "oneStarRatingsCount",
                    COALESCE(srbs.two_star_ratings, 0) as "twoStarRatingsCount",
                    COALESCE(srbs.three_star_ratings, 0) as "threeStarRatingsCount",
                    COALESCE(srbs.four_star_ratings, 0) as "fourStarRatingsCount",
                    COALESCE(srbs.five_star_ratings, 0) as "fiveStarRatingsCount",
                    -- Feedback entries
                    COALESCE(fmbs.parent_feedback_entries, 0) as "parentFeedbackEntries",
                    COALESCE(fmbs.teacher_feedback_entries, 0) as "teacherFeedbackEntries",
                    ym.subject_name as "subject",
                    ym.is_pupil_premium as "isPupilPremium",
                    ym.gender,
                    ym.ethnicity_code as "ethnicityCode",
                    ym.has_sen as "sen",
                    ym.english_as_additional_language_status as "englishAsAdditionalLanguage",

                    -- Active parents
                    COALESCE(apbs.active_parents_count, 0) as "activeParentsCount"

                FROM yearly_metrics ym
                LEFT JOIN completed_activities_by_subject cabs ON cabs.student_id = ym.student_id AND cabs.subject_id = ym.subject_id
                LEFT JOIN star_ratings_by_subject srbs ON srbs.student_id = ym.student_id AND srbs.subject_id = ym.subject_id
                LEFT JOIN feedback_metrics_by_subject fmbs ON fmbs.student_id = ym.student_id AND fmbs.subject_id = ym.subject_id
                LEFT JOIN active_parents_by_student apbs ON apbs.student_id = ym.student_id
                ON CONFLICT ("pupilId", "schoolId", "timeKey", "timeGrain", "subjectId")
                DO UPDATE SET
                    "isActive" = EXCLUDED."isActive",
                    "activitiesSetCount" = EXCLUDED."activitiesSetCount",
                    "activitiesCompletedCount" = EXCLUDED."activitiesCompletedCount",
                    "activitiesAccessedCount" = EXCLUDED."activitiesAccessedCount",
                    "topicsSetCount" = EXCLUDED."topicsSetCount",
                    "topicsCompletedCount" = EXCLUDED."topicsCompletedCount",
                    "readingTarget" = EXCLUDED."readingTarget",
                    "videosWatchedCount" = EXCLUDED."videosWatchedCount",
                    "parentCommentsLeftCount" = EXCLUDED."parentCommentsLeftCount",
                    "pupilCommentsLeftCount" = EXCLUDED."pupilCommentsLeftCount",
                    "teacherCommentsLeftCount" = EXCLUDED."teacherCommentsLeftCount",
                    "parentPhotosUploadedCount" = EXCLUDED."parentPhotosUploadedCount",
                    "teacherPhotosUploadedCount" = EXCLUDED."teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount" = EXCLUDED."parentAudioClipsUploadedCount",
                    "teacherAudioClipsUploadedCount" = EXCLUDED."teacherAudioClipsUploadedCount",
                    "starRatingsCount" = EXCLUDED."starRatingsCount",
                    "sumStarRatings" = EXCLUDED."sumStarRatings",
                    "oneStarRatingsCount" = EXCLUDED."oneStarRatingsCount",
                    "twoStarRatingsCount" = EXCLUDED."twoStarRatingsCount",
                    "threeStarRatingsCount" = EXCLUDED."threeStarRatingsCount",
                    "fourStarRatingsCount" = EXCLUDED."fourStarRatingsCount",
                    "fiveStarRatingsCount" = EXCLUDED."fiveStarRatingsCount",
                    "parentFeedbackEntries" = EXCLUDED."parentFeedbackEntries",
                    "teacherFeedbackEntries" = EXCLUDED."teacherFeedbackEntries",
                    "subject" = EXCLUDED."subject",
                    "isPupilPremium" = EXCLUDED."isPupilPremium",
                    "gender" = EXCLUDED."gender",
                    "ethnicityCode" = EXCLUDED."ethnicityCode",
                    "sen" = EXCLUDED."sen",
                    "englishAsAdditionalLanguage" = EXCLUDED."englishAsAdditionalLanguage",
                    "activeParentsCount" = EXCLUDED."activeParentsCount",
                    "updatedAt" = CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            SELECT cron.schedule(
                'upsert-pupil-fact-job-4am',
                '0 4 * * *',
                $$ SELECT upsert_pupil_fact(); $$
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'upsert-pupil-fact-job-4am';
        `);

        // Restore the function from migration 1775219085561-FixUpsertPupilFactFunction
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION upsert_pupil_fact()
            RETURNS void AS $$
            BEGIN
                INSERT INTO analytics_pupil_fact (
                    "pupilId",
                    "schoolId",
                    "timeKey",
                    "timeGrain",
                    "subjectId",
                    "isActive",
                    "activitiesSetCount",
                    "activitiesCompletedCount",
                    "activitiesAccessedCount",
                    "topicsSetCount",
                    "topicsCompletedCount",
                    "readingTarget",
                    "videosWatchedCount",
                    "parentCommentsLeftCount",
                    "pupilCommentsLeftCount",
                    "teacherCommentsLeftCount",
                    "parentPhotosUploadedCount",
                    "teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount",
                    "teacherAudioClipsUploadedCount",
                    "starRatingsCount",
                    "sumStarRatings",
                    "oneStarRatingsCount",
                    "twoStarRatingsCount",
                    "threeStarRatingsCount",
                    "fourStarRatingsCount",
                    "fiveStarRatingsCount",
                    "parentFeedbackEntries",
                    "teacherFeedbackEntries",
                    "subject",
                    "isPupilPremium",
                    "gender",
                    "ethnicityCode",
                    "sen",
                    "englishAsAdditionalLanguage",
                    "activeParentsCount"
                )
                WITH
                -- Constants for academic year
                constants AS (
                    SELECT
                        slp.index as time_key,
                        slp."startDate"::date as year_start,
                        slp."endDate"::date as year_end
                    FROM
                        static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                ),

                -- Base student-subject CTE (filtered by pupils with topic activity in the academic year)
                student_subject_base AS (
                    SELECT DISTINCT
                        lp.id as student_id,
                        lp."schoolId" as school_id,
                        COALESCE(lp."isPremium", false) as is_pupil_premium,
                        lp.gender,
                        CASE
                            WHEN ws.sen_status IS NULL THEN NULL
                            WHEN ws.sen_status IN ('N', 'N,', '') THEN false
                            ELSE true
                        END as has_sen,
                        ws.ethnicity_code,
                        ws.english_as_additional_language_status,
                        COALESCE(sltd."subjectId", 0) as subject_id,
                        COALESCE(sls.name,
                            CASE
                                WHEN slt."isReading" = true and sls.id is null  THEN 'Reading'
                                WHEN slt."isReading" = false AND sltd."subjectId" IS NULL THEN 'Other'
                                ELSE 'Unknown'
                            END
                        ) as subject_name,
                        lpt.id as pupil_topic_id,
                        lpt."releaseDate",
                        lpt."readingTarget",
                        lpt."watchedVideo",
                        lpt."logUpdatedAt",
                        slt.id as topic_id,
                        sla.id as static_activity_id
                    FROM lwp_pupil lp
                    JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
                    LEFT JOIN imported_student ws ON ws.id = lp."importedStudentId"
                    JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
                    JOIN static_lwp_topic slt ON slt.id = lpt."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = slt.id
                    LEFT JOIN static_lwp_topic_domain sltd ON sltd.id = sltdyg."domainId"
                    LEFT JOIN static_lwp_subject sls ON sls.id = sltd."subjectId"
                    LEFT JOIN static_lwp_activity sla ON sla."topicId" = slt.id
                    WHERE
                        lpt."releaseDate" >= (SELECT year_start FROM constants)
                        AND lpt."releaseDate" <= (SELECT year_end FROM constants)
                        AND lpt."logCreatedAt" >= (SELECT year_start FROM constants)
                        AND lpt."logCreatedAt" <= (SELECT year_end FROM constants)
                ),

                -- Completed activities aggregation
                completed_activities_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(DISTINCT lpa.id) as activities_completed_count
                    FROM student_subject_base ssb
                    JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    WHERE EXISTS (
                        SELECT 1 FROM lwp_pupil_feedback lpf
                        WHERE lpf."activityId" = lpa.id
                        AND lpf."userType" = 'PARENT'
                        AND lpf."type" = 'ACTIVITY'
                    )
                    GROUP BY ssb.student_id, ssb.subject_id
                ),

                -- Star ratings aggregation
                star_ratings_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating IS NOT NULL
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )) as total_star_ratings_given,
                        COALESCE(SUM(lpa.rating) FILTER (WHERE lpa.rating IS NOT NULL
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )), 0) as sum_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 1
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )) as one_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 2
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )) as two_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 3
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )) as three_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 4
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )) as four_star_ratings,
                        COUNT(lpa.rating) FILTER (WHERE lpa.rating = 5
                            AND EXISTS (
                                SELECT 1 FROM lwp_pupil_feedback lpf
                                WHERE lpf."activityId" = lpa.id
                                AND lpf."userType" = 'PARENT'
                            )) as five_star_ratings
                    FROM student_subject_base ssb
                    JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    CROSS JOIN constants c
                    WHERE lpa."logCreatedAt" BETWEEN c.year_start AND c.year_end
                        AND lpa.rating IS NOT NULL
                    GROUP BY ssb.student_id, ssb.subject_id
                ),

                -- Feedback metrics aggregation
                feedback_metrics_by_subject AS (
                    SELECT
                        ssb.student_id,
                        ssb.subject_id,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT'
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_parents_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PUPIL'
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_pupils_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER' AND lpf."comment" IS NOT NULL
                        ) as comments_left_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'PARENT') as photos_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'TEACHER') as photos_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'PARENT') as audio_clips_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'TEACHER') as audio_clips_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT') as parent_feedback_entries,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER') as teacher_feedback_entries
                    FROM student_subject_base ssb
                    LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = ssb.student_id
                    LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId" and lpf."originalFeedbackId" IS NULL
                    LEFT JOIN lwp_pupil_feedback_media lpfm ON lpfm."feedbackId" = lpf.id
                    LEFT JOIN lwp_pupil_activity lpa ON lpf."activityId" = lpa.id
                    LEFT JOIN lwp_pupil_topic lpt_feedback ON lpa."topicId" = lpt_feedback.id
                    LEFT JOIN static_lwp_topic slt_feedback ON slt_feedback.id = lpt_feedback."topicId"
                    LEFT JOIN static_lwp_topic_domain_year_group sltdyg_feedback ON sltdyg_feedback."topicId" = slt_feedback.id
                    LEFT JOIN static_lwp_topic_domain sltd_feedback ON sltd_feedback.id = sltdyg_feedback."domainId"
                    CROSS JOIN constants c
                    WHERE lpf."logCreatedAt" BETWEEN c.year_start AND c.year_end
                        AND (sltd_feedback."subjectId" = ssb.subject_id OR sltd_feedback."subjectId" IS NULL)
                    GROUP BY ssb.student_id, ssb.subject_id
                ),

                -- Active parents aggregation
                active_parents_by_student AS (
                    SELECT
                        ssb.student_id,
                        COUNT(DISTINCT lpp."parentId") FILTER (WHERE
                            lpp.status = 'ACTIVE'
                            AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS', 'IMPORTED')
                            AND lu."logCreatedAt" <= (SELECT year_end FROM constants)
                        ) as active_parents_count
                    FROM student_subject_base ssb
                    LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = ssb.student_id
                    LEFT JOIN lwp_user lu ON lu.id = lpp."parentId" AND lu.type = 'PARENT'
                    GROUP BY ssb.student_id
                ),

                -- Main yearly metrics aggregation
                yearly_metrics AS (
                    SELECT
                        c.time_key,
                        ssb.student_id,
                        ssb.school_id,
                        ssb.subject_id,
                        ssb.subject_name,
                        ssb.is_pupil_premium,
                        ssb.gender,
                        ssb.ethnicity_code,
                        ssb.has_sen,
                        ssb.english_as_additional_language_status,

                        -- Direct aggregations from base CTE
                        COUNT(DISTINCT ssb.static_activity_id) as activities_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) as topics_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."watchedVideo" = true) as videos_watched_count,

                        -- Activity access and completion
                        COUNT(DISTINCT lpa.id) FILTER (WHERE lpa."logCreatedAt" BETWEEN c.year_start AND c.year_end and (lpa."logAccessedOnMobile" <> 0 or lpa."logAccessedOnDesktop" <> 0)) as activities_accessed_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE
                            EXISTS (
                                SELECT 1 FROM lwp_pupil_activity lpa2
                                WHERE lpa2."topicId" = ssb.pupil_topic_id AND lpa2."earnedStar" = true
                            )
                            AND ssb."logUpdatedAt" BETWEEN c.year_start AND c.year_end
                        ) as topics_completed_count,

                        -- Reading target sum
                        COALESCE(SUM(ssb."readingTarget"), 0) as reading_target_sum
                    FROM student_subject_base ssb
                    CROSS JOIN constants c
                    LEFT JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    GROUP BY c.time_key, ssb.student_id, ssb.school_id, ssb.subject_id, ssb.subject_name,
                            ssb.is_pupil_premium, ssb.gender, ssb.ethnicity_code, ssb.has_sen, ssb.english_as_additional_language_status
                )

                -- Final SELECT with all analytics metrics
                SELECT
                    ym.student_id as "pupilId",
                    ym.school_id as "schoolId",
                    ym.time_key as "timeKey",
                    -- Time grain (always yearly for this extraction)
                    'yearly' as "timeGrain",
                    ym.subject_id as "subjectId",
                    (ym.activities_set_count > 0 OR ym.activities_accessed_count > 0) as "isActive",
                    -- Activity metrics
                    ym.activities_set_count as "activitiesSetCount",
                    COALESCE(cabs.activities_completed_count, 0) as "activitiesCompletedCount",
                    ym.activities_accessed_count as "activitiesAccessedCount",
                    ym.topics_set_count as "topicsSetCount",
                    ym.topics_completed_count as "topicsCompletedCount",
                    ym.reading_target_sum as "readingTarget",
                    ym.videos_watched_count as "videosWatchedCount",
                    -- Feedback metrics
                    COALESCE(fmbs.comments_left_by_parents_count, 0) as "parentCommentsLeftCount",
                    COALESCE(fmbs.comments_left_by_pupils_count, 0) as "pupilCommentsLeftCount",
                    COALESCE(fmbs.comments_left_by_teachers_count, 0) as "teacherCommentsLeftCount",
                    COALESCE(fmbs.photos_uploaded_by_parents_count, 0) as "parentPhotosUploadedCount",
                    COALESCE(fmbs.photos_uploaded_by_teachers_count, 0) as "teacherPhotosUploadedCount",
                    COALESCE(fmbs.audio_clips_uploaded_by_parents_count, 0) as "parentAudioClipsUploadedCount",
                    COALESCE(fmbs.audio_clips_uploaded_by_teachers_count, 0) as "teacherAudioClipsUploadedCount",
                    -- Star ratings
                    COALESCE(srbs.total_star_ratings_given, 0) as "starRatingsCount",
                    COALESCE(srbs.sum_star_ratings, 0) as "sumStarRatings",
                    COALESCE(srbs.one_star_ratings, 0) as "oneStarRatingsCount",
                    COALESCE(srbs.two_star_ratings, 0) as "twoStarRatingsCount",
                    COALESCE(srbs.three_star_ratings, 0) as "threeStarRatingsCount",
                    COALESCE(srbs.four_star_ratings, 0) as "fourStarRatingsCount",
                    COALESCE(srbs.five_star_ratings, 0) as "fiveStarRatingsCount",
                    -- Feedback entries
                    COALESCE(fmbs.parent_feedback_entries, 0) as "parentFeedbackEntries",
                    COALESCE(fmbs.teacher_feedback_entries, 0) as "teacherFeedbackEntries",
                    ym.subject_name as "subject",
                    ym.is_pupil_premium as "isPupilPremium",
                    ym.gender,
                    ym.ethnicity_code as "ethnicityCode",
                    ym.has_sen as "sen",
                    ym.english_as_additional_language_status as "englishAsAdditionalLanguage",

                    -- Active parents
                    COALESCE(apbs.active_parents_count, 0) as "activeParentsCount"

                FROM yearly_metrics ym
                LEFT JOIN completed_activities_by_subject cabs ON cabs.student_id = ym.student_id AND cabs.subject_id = ym.subject_id
                LEFT JOIN star_ratings_by_subject srbs ON srbs.student_id = ym.student_id AND srbs.subject_id = ym.subject_id
                LEFT JOIN feedback_metrics_by_subject fmbs ON fmbs.student_id = ym.student_id AND fmbs.subject_id = ym.subject_id
                LEFT JOIN active_parents_by_student apbs ON apbs.student_id = ym.student_id
                ON CONFLICT ("pupilId", "schoolId", "timeKey", "timeGrain", "subjectId")
                DO UPDATE SET
                    "isActive" = EXCLUDED."isActive",
                    "activitiesSetCount" = EXCLUDED."activitiesSetCount",
                    "activitiesCompletedCount" = EXCLUDED."activitiesCompletedCount",
                    "activitiesAccessedCount" = EXCLUDED."activitiesAccessedCount",
                    "topicsSetCount" = EXCLUDED."topicsSetCount",
                    "topicsCompletedCount" = EXCLUDED."topicsCompletedCount",
                    "readingTarget" = EXCLUDED."readingTarget",
                    "videosWatchedCount" = EXCLUDED."videosWatchedCount",
                    "parentCommentsLeftCount" = EXCLUDED."parentCommentsLeftCount",
                    "pupilCommentsLeftCount" = EXCLUDED."pupilCommentsLeftCount",
                    "teacherCommentsLeftCount" = EXCLUDED."teacherCommentsLeftCount",
                    "parentPhotosUploadedCount" = EXCLUDED."parentPhotosUploadedCount",
                    "teacherPhotosUploadedCount" = EXCLUDED."teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount" = EXCLUDED."parentAudioClipsUploadedCount",
                    "teacherAudioClipsUploadedCount" = EXCLUDED."teacherAudioClipsUploadedCount",
                    "starRatingsCount" = EXCLUDED."starRatingsCount",
                    "sumStarRatings" = EXCLUDED."sumStarRatings",
                    "oneStarRatingsCount" = EXCLUDED."oneStarRatingsCount",
                    "twoStarRatingsCount" = EXCLUDED."twoStarRatingsCount",
                    "threeStarRatingsCount" = EXCLUDED."threeStarRatingsCount",
                    "fourStarRatingsCount" = EXCLUDED."fourStarRatingsCount",
                    "fiveStarRatingsCount" = EXCLUDED."fiveStarRatingsCount",
                    "parentFeedbackEntries" = EXCLUDED."parentFeedbackEntries",
                    "teacherFeedbackEntries" = EXCLUDED."teacherFeedbackEntries",
                    "subject" = EXCLUDED."subject",
                    "isPupilPremium" = EXCLUDED."isPupilPremium",
                    "gender" = EXCLUDED."gender",
                    "ethnicityCode" = EXCLUDED."ethnicityCode",
                    "sen" = EXCLUDED."sen",
                    "englishAsAdditionalLanguage" = EXCLUDED."englishAsAdditionalLanguage",
                    "activeParentsCount" = EXCLUDED."activeParentsCount",
                    "updatedAt" = CURRENT_TIMESTAMP;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            SELECT cron.schedule(
                'upsert-pupil-fact-job-4am',
                '0 4 * * *',
                $$ SELECT upsert_pupil_fact(); $$
            );
        `);
    }
}
