-- Create a function to generate the impact summary
-- This approach is more maintainable and allows for better error handling

CREATE OR REPLACE FUNCTION generate_impact_summary(
    start_year INTEGER DEFAULT 2022,
    end_year INTEGER DEFAULT 2024
)
RETURNS TABLE (
    year INTEGER,
    pupils_active_all BIGINT,
    pupils_active_pp BIGINT,
    parents_registered_all BIGINT,
    parents_registered_pp BIGINT,
    percentage_pp NUMERIC,
    pupils_watched_video_all BIGINT,
    pupils_watched_video_pp BIGINT,
    pupils_completed_activity_all BIGINT,
    pupils_completed_activity_pp BIGINT,
    percentage_pupils_completed_activity_all NUMERIC,
    percentage_pupils_completed_activity_pp NUMERIC,
    pupils_recorded_reading_all BIGINT,
    pupils_recorded_reading_pp BIGINT,
    activities_completed_all BIGINT,
    activities_completed_pp BIGINT,
    comments_left_all BIGINT,
    comments_left_pp BIGINT,
    average_star_rating_all NUMERIC,
    average_star_rating_pp NUMERIC,
    photos_uploaded_all BIGINT,
    photos_uploaded_pp BIGINT,
    audio_clips_uploaded_all BIGINT,
    audio_clips_uploaded_pp BIGINT,
    average_entries_per_student_all NUMERIC,
    average_entries_per_student_pp NUMERIC,
    average_activity_entries_per_student_all NUMERIC,
    average_activity_entries_per_student_pp NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate input parameters
    IF start_year > end_year THEN
        RAISE EXCEPTION 'Start year cannot be greater than end year';
    END IF;
    
    -- Return the impact summary data
    RETURN QUERY
    WITH year_data AS (
        SELECT generate_series(start_year, end_year) AS period_index
    ),
    
    -- Your CTE definitions here (build incrementally)
    active_pupils AS (
        SELECT DISTINCT
            pupil_id,
            "isPremium",
            period_index
        FROM (
            -- Reading sessions
            SELECT DISTINCT
                lpfh."lwpPupilId" as pupil_id,
                lp."isPremium",
                lpf."periodIndex" as period_index
            FROM lwp_pupil_feedback lpf
            JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
            JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
            JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
            WHERE lpf."periodIndex" BETWEEN start_year AND end_year
              AND lpf."type" = 'READING'
            
            UNION
            
            -- Activity completions
            SELECT DISTINCT
                lpa."pupilId",
                lp."isPremium", 
                lpt."periodIndex" as period_index
            FROM lwp_pupil_activity lpa
            JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
            JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
            JOIN lwp_school ls ON lp."schoolId" = ls."id" AND NOT ls."isTestSchool"
            WHERE lpt."periodIndex" BETWEEN start_year AND end_year
              AND (
                lpa.rating IS NOT NULL
                OR EXISTS (
                  SELECT 1 FROM lwp_pupil_feedback lpf
                  WHERE lpf."activityId" = lpa.id
                  AND (
                    lpf."pupilComment" IS NOT NULL
                    OR lpf."parentComment" IS NOT NULL  
                    OR lpf."comment" IS NOT NULL
                    OR EXISTS (
                      SELECT 1 FROM lwp_pupil_feedback_media lpfm 
                      WHERE lpfm."feedbackId" = lpf.id
                    )
                  )
                )
              )
        ) active_pupil_activities
    )
    
    -- Start with basic metrics and build up
    SELECT
        yd.period_index::INTEGER,
        COALESCE(ap_all.pupils_active_all, 0)::BIGINT,
        COALESCE(ap_pp.pupils_active_pp, 0)::BIGINT,
        0::BIGINT, -- parents_registered_all - add later
        0::BIGINT, -- parents_registered_pp - add later
        CASE 
            WHEN COALESCE(ap_all.pupils_active_all, 0) > 0 THEN 
                ROUND((COALESCE(ap_pp.pupils_active_pp, 0)::numeric / ap_all.pupils_active_all) * 100, 2)
            ELSE 0 
        END::NUMERIC,
        -- Add remaining columns as 0 initially, then implement incrementally
        0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC, 0::NUMERIC,
        0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT,
        0::NUMERIC, 0::NUMERIC, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT,
        0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC

    FROM year_data yd

    LEFT JOIN (
        SELECT period_index, COUNT(DISTINCT pupil_id) as pupils_active_all
        FROM active_pupils WHERE "isPremium" IS NOT TRUE
        GROUP BY period_index
    ) ap_all ON yd.period_index = ap_all.period_index

    LEFT JOIN (
        SELECT period_index, COUNT(DISTINCT pupil_id) as pupils_active_pp
        FROM active_pupils WHERE "isPremium" = true
        GROUP BY period_index
    ) ap_pp ON yd.period_index = ap_pp.period_index

    ORDER BY yd.period_index;
END;
$$;

-- Usage example:
-- SELECT * FROM generate_impact_summary(2022, 2024);
