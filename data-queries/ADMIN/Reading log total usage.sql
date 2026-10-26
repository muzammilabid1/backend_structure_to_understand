SELECT
    CASE WHEN GROUPING (p."isPremium") = 1 THEN
        'total'
    WHEN p."isPremium" IS NULL THEN
        'unknown'
    WHEN p."isPremium" = FALSE THEN
        'no'
    WHEN p."isPremium" = TRUE THEN
        'yes'
    END AS "pupil_premium",
    count(DISTINCT p.id) AS pupils,
    count(DISTINCT f.id) AS log_entries,
    count(
        CASE WHEN m.type = 'AUDIO' THEN
            1
        ELSE
            NULL
        END) AS audio_recordings,
    count(
        CASE WHEN m.type = 'PHOTO' THEN
            1
        ELSE
            NULL
        END) AS photos
FROM
    lwp_pupil_feedback f
    LEFT JOIN lwp_pupil_feedback_media m ON m."feedbackId" = f.id
    JOIN lwp_pupil_feedback_history fh ON fh."lwpPupilFeedbackId" = f.id
    JOIN lwp_pupil p ON p.id = fh."lwpPupilId"
    JOIN lwp_school s ON s.id = p."schoolId"
WHERE
    "bookReadAt" IS NOT NULL
    AND NOT s."isTestSchool"
GROUP BY
    ROLLUP (p."isPremium")
