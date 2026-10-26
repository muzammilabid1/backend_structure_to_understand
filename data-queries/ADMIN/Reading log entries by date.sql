SELECT
    d.date,
    count(DISTINCT f.id)
FROM (
    SELECT
        to_char(date_trunc('day', (CURRENT_DATE - offs)), 'YYYY-MM-DD') AS date
    FROM
        generate_series(0, 365, 1) AS offs) d
LEFT OUTER JOIN lwp_pupil_feedback f ON d.date = to_char(date_trunc('day', f."logCreatedAt"), 'YYYY-MM-DD')
JOIN lwp_pupil_feedback_history fh ON fh."lwpPupilFeedbackId" = f.id
JOIN lwp_pupil p ON p.id = fh."lwpPupilId"
JOIN lwp_school s ON s.id = p."schoolId"
    LEFT JOIN lwp_pupil_feedback_media m ON m."feedbackId" = f.id
WHERE
    f."isBookFinished" IS NOT NULL
    AND NOT "isTestSchool"
    AND NOT inactive
GROUP BY
    d.date