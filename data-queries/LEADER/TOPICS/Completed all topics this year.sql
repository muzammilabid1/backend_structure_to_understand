-- Gets all pupils who have completed all topics, except for
-- any where the due date is not reached yet, or if there's no due date
-- then any released less than two weeks ago.
SELECT
    concat(lp.firstname, ' ', lp.lastname) AS "Pupil name",
    slyg."year" AS "Year group",
    lsc."name" AS "Class name"
FROM
    lwp_pupil lp
    JOIN lwp_school ls ON lp."schoolId" = ls.id
    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
    JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
        AND lsc."periodIndex" = coalesce(current_setting('lwp.period_index', TRUE)::int, ls."curentPeriodIndex")
        AND lsc."isRegistrationClass"
    JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
        AND lpt."periodIndex" = coalesce(current_setting('lwp.period_index', TRUE)::int, ls."curentPeriodIndex")
    JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
WHERE
    ls.id = current_setting('lwp.school_id')::bigint
    AND lpt."readingTarget" IS NULL
    AND COALESCE(lct."dueDate", lpt."releaseDate" + interval '2 weeks') < CURRENT_DATE
GROUP BY
    lp.id,
    lsc.id,
    slyg.id
HAVING
    count(lpt.id) FILTER (WHERE NOT lpt."earnedGoldStar") = 0
ORDER BY slyg.id, lsc."name", lp.lastname, lp.firstname
