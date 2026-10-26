-- Extended Impact Summary Query - Add these CTEs to the base query
-- This extends the basic query with video, activity, and engagement metrics

-- Add these CTEs after the registered_parents CTE in the base query:

-- Pupils who watched videos
video_watchers AS (
  SELECT DISTINCT
    lpt."pupilId",
    lp."isPremium",
    EXTRACT(YEAR FROM lpt."releaseDate")::integer as period_index
  FROM lwp_pupil_topic lpt
  JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
  JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
  WHERE lpt."watchedVideo" = true
    AND EXTRACT(YEAR FROM lpt."releaseDate") IN (2022, 2023, 2024)
),

-- Pupils who completed activities (left comment, photo, or rating)
activity_completers AS (
  SELECT DISTINCT
    lpa."pupilId",
    lp."isPremium",
    lpt."periodIndex" as period_index
  FROM lwp_pupil_activity lpa
  JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
  JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
  JOIN lwp_school ls ON lp."schoolId" = ls."id" AND NOT ls."isTestSchool"
  WHERE lpt."periodIndex" IN (2022, 2023, 2024)
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
),

-- Pupils who recorded reading sessions
reading_recorders AS (
  SELECT DISTINCT
    lpfh."lwpPupilId" as pupil_id,
    lp."isPremium",
    lpf."periodIndex" as period_index
  FROM lwp_pupil_feedback lpf
  JOIN lwp_pupil_feedback_history lpfh ON lpf.id = lpfh."lwpPupilFeedbackId"
  JOIN lwp_pupil lp ON lpfh."lwpPupilId" = lp.id
  JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
  WHERE lpf."periodIndex" IN (2022, 2023, 2024)
    AND lpf."type" = 'READING'
),

-- Activity completion counts
activity_completions AS (
  SELECT 
    lpf."periodIndex" as period_index,
    lp."isPremium",
    COUNT(*) as completion_count
  FROM lwp_pupil_feedback lpf
  JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
  JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
  JOIN lwp_school ls ON lp."schoolId" = ls."id" AND NOT ls."isTestSchool"
  WHERE lpf."periodIndex" IN (2022, 2023, 2024)
  GROUP BY lpf."periodIndex", lp."isPremium"
),

-- Comments data (from pupils AND parents)
comments_data AS (
  SELECT
    lpf."periodIndex" as period_index,
    lp."isPremium",
    COUNT(DISTINCT lpf.id) as comment_count
  FROM lwp_pupil_feedback lpf
  JOIN lwp_pupil_feedback_history lpfh ON lpf.id = lpfh."lwpPupilFeedbackId"
  JOIN lwp_pupil lp ON lpfh."lwpPupilId" = lp.id
  JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
  WHERE lpf."periodIndex" IN (2022, 2023, 2024)
    AND (lpf."pupilComment" IS NOT NULL OR lpf."parentComment" IS NOT NULL OR lpf."comment" IS NOT NULL)
  GROUP BY lpf."periodIndex", lp."isPremium"
),

-- Star ratings data
ratings_data AS (
  SELECT
    lpt."periodIndex" as period_index,
    lp."isPremium",
    AVG(lpa.rating) as avg_rating,
    COUNT(lpa.rating) as rating_count
  FROM lwp_pupil_activity lpa
  JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
  JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
  JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
  WHERE lpt."periodIndex" IN (2022, 2023, 2024)
    AND lpa.rating IS NOT NULL
  GROUP BY lpt."periodIndex", lp."isPremium"
)

-- Then add these columns to your SELECT statement:
-- Pupils who watched videos
COALESCE(video_all.video_watchers_all, 0) as pupils_watched_video_all,
COALESCE(video_pp.video_watchers_pp, 0) as pupils_watched_video_pp,

-- Pupils who completed activities
COALESCE(activity_pupils_all.activity_completers_all, 0) as pupils_completed_activity_all,
COALESCE(activity_pupils_pp.activity_completers_pp, 0) as pupils_completed_activity_pp,

-- Activity completion percentages
CASE 
  WHEN COALESCE(ap_all.pupils_active_all, 0) > 0 THEN 
    ROUND((COALESCE(activity_pupils_all.activity_completers_all, 0)::numeric / ap_all.pupils_active_all) * 100, 2)
  ELSE 0 
END as percentage_pupils_completed_activity_all,

-- Reading session data
COALESCE(reading_all.reading_recorders_all, 0) as pupils_recorded_reading_all,
COALESCE(reading_pp.reading_recorders_pp, 0) as pupils_recorded_reading_pp,

-- Activity completion counts
COALESCE(completions_all.completions_all, 0) as activities_completed_all,
COALESCE(completions_pp.completions_pp, 0) as activities_completed_pp,

-- Comments
COALESCE(comments_all.comments_all, 0) as comments_left_all,
COALESCE(comments_pp.comments_pp, 0) as comments_left_pp,

-- Ratings
ROUND(COALESCE(ratings_all.avg_rating_all, 0), 2) as average_star_rating_all,
ROUND(COALESCE(ratings_pp.avg_rating_pp, 0), 2) as average_star_rating_pp

-- And add these JOINs to your query:
LEFT JOIN (
  SELECT period_index, COUNT(DISTINCT "pupilId") as video_watchers_all
  FROM video_watchers WHERE "isPremium" IS NOT TRUE
  GROUP BY period_index
) video_all ON yd.period_index = video_all.period_index

LEFT JOIN (
  SELECT period_index, COUNT(DISTINCT "pupilId") as video_watchers_pp
  FROM video_watchers WHERE "isPremium" = true
  GROUP BY period_index
) video_pp ON yd.period_index = video_pp.period_index

-- Continue with other JOINs as needed...
