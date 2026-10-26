WITH school_pts AS (
    SELECT
        lpt.*::lwp_pupil_topic,
        lp.*::lwp_pupil,
        ls."curentPeriodIndex" AS school_period,
        row_number() OVER (PARTITION BY lp.id ORDER BY lpt."releaseDate" DESC) AS ord
    FROM
        lwp_pupil_topic lpt
        JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
        JOIN lwp_school ls ON ls.id = lp."schoolId"
    WHERE
        lpt."readingTarget" != 0
        AND ls.id = current_setting('lwp.school_id')::bigint
        AND lpt."releaseDate" + interval '7 days' <= current_date
)
SELECT
    concat((q.lp).firstname, ' ', (q.lp).lastname) AS "Pupil name",
    slyg."year" AS "Year group",
    lsc."name" AS "Class name",
    concat(to_char((q.lpt)."releaseDate", 'Dy DD Mon'), ' to ', to_char((q.lpt)."releaseDate" + interval '6 days', 'Dy DD Mon')) AS "Week achieved"
FROM
    school_pts q
    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = (q.lp).id
    JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
        AND lsc."isRegistrationClass"
        AND lsc."periodIndex" = q.school_period
    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
WHERE
    ord = 1
    AND (q.lpt)."earnedGoldStar"
ORDER BY
    slyg."year",
    lsc."name",
    (q.lp).firstname
;