SELECT
    concat(lp.firstname, ' ', lp.lastname) AS "Pupil name",
    any_value (slyg_2023."year") AS "Last year's year group",
    any_value (lsc_2023.name) AS "Last year's class",
    any_value (slyg_2024."year") AS "This year's year group",
    any_value (lsc_2024."name") AS "This year's class",
    count(DISTINCT coalesce(lpf."bookReadAt", lpf."logCreatedAt")::date) AS "Days read on over the summer"
FROM
    lwp_pupil lp
    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
    LEFT JOIN lwp_school_class lsc_2023 ON lsc_2023.id = lcp."lwpSchoolClassId"
        AND lsc_2023."isRegistrationClass"
        AND lsc_2023."periodIndex" = '2023'
    LEFT JOIN static_lwp_year_group slyg_2023 ON slyg_2023.id = lsc_2023."yearGroup"
    LEFT JOIN lwp_school_class lsc_2024 ON lsc_2024.id = lcp."lwpSchoolClassId"
        AND lsc_2024."isRegistrationClass"
        AND lsc_2024."periodIndex" = '2024'
    LEFT JOIN static_lwp_year_group slyg_2024 ON slyg_2024.id = lsc_2024."yearGroup"
    LEFT JOIN lwp_pupil_feedback_history lpfh ON lp.id = lpfh."lwpPupilId"
    LEFT JOIN lwp_pupil_feedback lpf ON lpfh."lwpPupilFeedbackId" = lpf.id
        AND coalesce(lpf."bookReadAt", lpf."logCreatedAt") >= '2024-07-24'
    AND coalesce(lpf."bookReadAt", lpf."logCreatedAt") <= '2024-08-31'
    AND lpf."userType" <> 'TEACHER'
WHERE (lsc_2023.id IS NOT NULL
    OR lsc_2024.id IS NOT NULL)
AND lpf."type" = 'READING'
AND lp."schoolId" = current_setting('lwp.school_id')::bigint
GROUP BY
    lp.id
