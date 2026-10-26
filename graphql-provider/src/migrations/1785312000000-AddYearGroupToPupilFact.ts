import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddYearGroupToPupilFact1785312000000 implements MigrationInterface {
    name = 'AddYearGroupToPupilFact1785312000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'upsert-pupil-fact-job-4am';
        `);

        // Add the pupil's class year group as a denormalised dimension on the fact table
        // so fundraising graphs can group topics/activities/etc. by year group without
        // joining operational tables at query time. Named "classYearGroup" because it is
        // derived from the pupil's class, not stored on the pupil directly.
        await queryRunner.query(`
            ALTER TABLE analytics_pupil_fact
            ADD COLUMN IF NOT EXISTS "classYearGroup" character varying;
        `);

        /**
         * Adds "classYearGroup" to upsert_pupil_fact():
         *
         * A new pupil_class_year_group CTE resolves each pupil to exactly ONE year group
         * via lwp_class_pupil -> lwp_school_class -> static_lwp_year_group, scoped to the
         * current period's active classes. DISTINCT ON (lwpPupilId) guarantees a single
         * row per pupil so it can be added to yearly_metrics' GROUP BY without splitting
         * a pupil's metrics across rows (which would otherwise break the ON CONFLICT
         * upsert on the (pupilId, schoolId, timeKey, timeGrain, subjectId) unique key).
         *
         * Everything else is identical to migration 1781187457887.
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
                    "classYearGroup",
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

                -- Resolve each pupil to a single class year group (their current-period class).
                pupil_class_year_group AS (
                    SELECT DISTINCT ON (lcp."lwpPupilId")
                        lcp."lwpPupilId" as student_id,
                        slyg.year as class_year_group
                    FROM student_subjects sb
                    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = sb.student_id
                    JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
                    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
                    CROSS JOIN constants c
                    WHERE lsc."periodIndex" >= c.time_key
                        AND lsc.status = 'ACTIVE'
                    ORDER BY lcp."lwpPupilId", lsc.id
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
                        pcyg.class_year_group,

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
                    LEFT JOIN pupil_class_year_group pcyg ON pcyg.student_id = ssb.student_id
                    LEFT JOIN lwp_pupil_activity lpa ON lpa."activityId" = ssb.static_activity_id
                        AND lpa."topicId" = ssb.pupil_topic_id
                    GROUP BY c.time_key, ssb.student_id, ssb.school_id, ssb.subject_id, ssb.subject_name,
                            ssb.is_pupil_premium, ssb.gender, ssb.ethnicity_code, ssb.has_sen, ssb.english_as_additional_language_status,
                            pcyg.class_year_group
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
                    ym.class_year_group as "classYearGroup",

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
                    "classYearGroup" = EXCLUDED."classYearGroup",
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

        // Restore the function from migration 1781187457887-OptimiseUpsertPupilFactFunction
        // (without the "classYearGroup" column).
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
            ALTER TABLE analytics_pupil_fact DROP COLUMN IF EXISTS "classYearGroup";
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
