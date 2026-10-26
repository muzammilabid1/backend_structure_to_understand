SELECT
    s."schoolName",
    count(*)
FROM
    lwp_pupil_feedback f
    JOIN lwp_pupil_feedback_history fh ON fh."lwpPupilFeedbackId" = f.id
    JOIN lwp_pupil p ON p.id = fh."lwpPupilId"
    JOIN lwp_school s ON s.id = p."schoolId"
WHERE
    f."isBookFinished" IS NOT NULL
    AND NOT s."isTestSchool"
    AND NOT s.inactive
GROUP BY
    s.id