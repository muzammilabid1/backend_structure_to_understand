import { MigrationInterface, QueryRunner } from 'typeorm';

export class PgCronTaskForCleanUpAndInsertPupilFactFunction1768445101543 implements MigrationInterface {
    name = 'PgCronTaskForCleanUpAndInsertPupilFactFunction1768445101543';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS pg_cron;
        `);

        // Unschedule the existing job to avoid conflict
        await queryRunner.query(`
            SELECT cron.unschedule('clean-up-and-insert-pupil-fact-job-4am');
        `);

        // Create the cleanup and insert function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION clean_up_and_insert_pupil_fact() 
            RETURNS void AS $$
            BEGIN
                DELETE FROM analytics_pupil_fact 
                WHERE "timeKey" = (
                    SELECT index FROM static_lwp_period slp
                    WHERE
                        slp."isCurrentPeriod" = true
                );

                INSERT INTO analytics_pupil_fact (
                    "pupilId", "schoolId", "timeKey", "timeGrain", "subjectId", "isActive", "activitiesSetCount",
                    "activitiesCompletedCount", "activitiesAccessedCount", "topicsSetCount", "topicsCompletedCount",
                    "readingTarget", "videosWatchedCount", "parentCommentsLeftCount", "pupilCommentsLeftCount",
                    "teacherCommentsLeftCount", "parentPhotosUploadedCount", "teacherPhotosUploadedCount",
                    "parentAudioClipsUploadedCount", "teacherAudioClipsUploadedCount", "starRatingsCount",
                    "sumStarRatings", "oneStarRatingsCount", "twoStarRatingsCount", "threeStarRatingsCount",
                    "fourStarRatingsCount", "fiveStarRatingsCount", "parentFeedbackEntries", "teacherFeedbackEntries",
                    "subject", "isPupilPremium", "gender", "ethnicityCode", "sen", "englishAsAdditionalLanguage" ,"activeParentsCount"
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
                        lp."isPremium" as is_pupil_premium,
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
                                WHEN sltd."subjectId" = 0 THEN 'Reading'
                                WHEN sltd."subjectId" IS NULL THEN 'Other'
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
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER' 
                            AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
                        ) as comments_left_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'PARENT') as photos_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'PHOTO' AND lpf."userType" = 'TEACHER') as photos_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'PARENT') as audio_clips_uploaded_by_parents_count,
                        COUNT(DISTINCT lpfm.id) FILTER (WHERE lpfm."type" = 'AUDIO' AND lpf."userType" = 'TEACHER') as audio_clips_uploaded_by_teachers_count,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'PARENT') as parent_feedback_entries,
                        COUNT(DISTINCT lpf.id) FILTER (WHERE lpf."userType" = 'TEACHER') as teacher_feedback_entries
                    FROM student_subject_base ssb
                    LEFT JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = ssb.student_id
                    LEFT JOIN lwp_pupil_feedback lpf ON lpf.id = lpfh."lwpPupilFeedbackId"
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
                        COUNT(DISTINCT ssb.pupil_topic_id) as activities_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) as topics_set_count,
                        COUNT(DISTINCT ssb.pupil_topic_id) FILTER (WHERE ssb."watchedVideo" = true) as videos_watched_count,

                        -- Activity access and completion
                        COUNT(DISTINCT lpa.id) FILTER (WHERE lpa."logCreatedAt" BETWEEN c.year_start AND c.year_end) as activities_accessed_count,
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
                ORDER BY ym.school_id, ym.student_id, ym.subject_id;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Schedule the task to run at 4 AM every day
        await queryRunner.query(`
            SELECT cron.schedule(
                'clean-up-and-insert-pupil-fact-job-4am',
                '0 4 * * *',
                $$ SELECT clean_up_and_insert_pupil_fact(); $$
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Unschedule the task
        await queryRunner.query(`
            SELECT cron.unschedule('clean-up-and-insert-pupil-fact-job-4am');
        `);

        // Drop the function and extension
        await queryRunner.query(`
            DROP FUNCTION IF EXISTS clean_up_and_insert_pupil_fact;
        `);

        await queryRunner.query(`
            DROP EXTENSION IF EXISTS pg_cron;
        `);
    }
}
