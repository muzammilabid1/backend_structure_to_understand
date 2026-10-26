SELECT
    coalesce((
        SELECT
            "schoolName"
        FROM lwp_school
        WHERE
            id = ls.id), 'Total across all schools') AS "School name",
    count(DISTINCT lp.id) FILTER (WHERE lpt.id IS NOT NULL) AS "Num eligible pupils",
    count(DISTINCT lptr."pupilId") AS "Num winners",
    CASE WHEN count(DISTINCT lp.id) FILTER (WHERE lpt.id IS NOT NULL) = 0 THEN
        0
    ELSE
        100 * (count(DISTINCT lptr.id)::float / count(DISTINCT lp.id) FILTER (WHERE lpt.id IS NOT NULL))
    END AS "% winner"
FROM
    lwp_pupil lp
    CROSS JOIN (
        SELECT
            *
        FROM
            static_lwp_trophy slt
        ORDER BY
            "endDate" DESC
        LIMIT 1) current_trophy
    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
    JOIN lwp_school ls ON ls.id = lp."schoolId"
        AND NOT ls.inactive
        AND NOT ls."isTestSchool"
    JOIN lwp_school_class lsc ON lsc.id = lcp."lwpSchoolClassId"
        AND lsc."isRegistrationClass"
        AND lsc."periodIndex" = ls."curentPeriodIndex"
    JOIN static_lwp_topic rt ON rt."isReading" = true
    LEFT JOIN lwp_pupil_trophy lptr ON lp.id = lptr."pupilId"
        AND lptr."trophyId" = current_trophy.id
    LEFT JOIN lwp_pupil_topic lpt ON lp.id = lpt."pupilId"
        AND lpt."topicId" != rt.id
        AND lpt."periodIndex" = ls."curentPeriodIndex"
        AND daterange(current_trophy."startDate"::date, current_trophy."endDate"::date) @> lpt."releaseDate"
GROUP BY
    ROLLUP (ls.id);