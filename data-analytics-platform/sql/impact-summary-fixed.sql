-- Fixed Impact Summary Query - Broken into manageable sections
-- Run this in sections or as a stored procedure

-- Section 1: Core metrics
WITH year_data AS (
  SELECT unnest(ARRAY[2022, 2023, 2024]::integer[]) AS period_index
),

-- Active pupils: those who completed an activity OR recorded a reading session  
active_pupils AS (
  SELECT DISTINCT
    pupil_id,
    "isPremium",
    period_index
  FROM (
    -- Pupils who recorded reading sessions
    SELECT DISTINCT
      lpfh."lwpPupilId" as pupil_id,
      lp."isPremium",
      lpf."periodIndex" as period_index
    FROM lwp_pupil_feedback lpf
    JOIN lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilFeedbackId" = lpf.id
    JOIN lwp_pupil lp ON lp.id = lpfh."lwpPupilId"
    JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
    WHERE lpf."periodIndex" IN (2022, 2023, 2024)
      AND lpf."type" = 'READING'
    
    UNION
    
    -- Pupils who completed activities (left comment, photo, or rating)
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
  ) active_pupil_activities
),

-- All registered parents (cumulative)
registered_parents AS (
  SELECT 
    yd.period_index,
    COUNT(DISTINCT lu.id) as all_parents,
    COUNT(DISTINCT lu.id) FILTER (WHERE EXISTS (
      SELECT 1 FROM lwp_pupil_parent lpp 
      JOIN lwp_pupil lp ON lpp."pupilId" = lp.id 
      WHERE lpp."parentId" = lu.id 
      AND lp."isPremium" = true 
      AND lpp.status = 'ACTIVE'
    )) as pp_parents
  FROM year_data yd
  CROSS JOIN lwp_user lu
  WHERE EXTRACT(YEAR FROM lu."logCreatedAt") <= yd.period_index
    AND lu."userStatus" IN ('ACTIVE', 'ACCOUNTLESS')
    AND lu.type = 'PARENT'
    AND EXISTS (
      SELECT 1 FROM lwp_pupil_parent lpp 
      JOIN lwp_pupil lp ON lpp."pupilId" = lp.id 
      JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
      WHERE lpp."parentId" = lu.id 
      AND lpp.status = 'ACTIVE'
    )
  GROUP BY yd.period_index
)

-- Basic output with core metrics
SELECT
  yd.period_index as year,
  
  -- Active pupils
  COALESCE(ap_all.pupils_active_all, 0) as pupils_active_all,
  COALESCE(ap_pp.pupils_active_pp, 0) as pupils_active_pp,
  
  -- Parents registered
  COALESCE(rp.all_parents, 0) as parents_registered_all,
  COALESCE(rp.pp_parents, 0) as parents_registered_pp,
  
  -- Percentage of PP
  CASE 
    WHEN COALESCE(ap_all.pupils_active_all, 0) > 0 THEN 
      ROUND((COALESCE(ap_pp.pupils_active_pp, 0)::numeric / ap_all.pupils_active_all) * 100, 2)
    ELSE 0 
  END as percentage_pp

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

LEFT JOIN registered_parents rp ON yd.period_index = rp.period_index

ORDER BY yd.period_index;
