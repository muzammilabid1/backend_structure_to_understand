SELECT
    coalesce(slyg."shortName", 'Total') AS "Year",
    count(DISTINCT lp.id) FILTER (WHERE lsc."IsReadingLogsEnabled"
        AND NOT lsc."isFullProgramme") AS "Num pupils RL only",
    count(DISTINCT lp.id) FILTER (WHERE NOT lsc."IsReadingLogsEnabled"
        AND lsc."isFullProgramme") AS "Num pupils FP only",
    count(DISTINCT lp.id) FILTER (WHERE lsc."IsReadingLogsEnabled"
        AND lsc."isFullProgramme") AS "Num pupils RL+FP",
    count(DISTINCT lp.id) AS "Total num pupils"
FROM
    lwp_pupil lp
    JOIN lwp_class_pupil lcp ON lcp."lwpPupilId" = lp.id
    JOIN lwp_school_class lsc ON lcp."lwpSchoolClassId" = lsc.id
        AND lsc."isRegistrationClass"
        AND lsc."status" = 'ACTIVE'
    JOIN lwp_school ls ON ls.id = lsc."schoolId"
        AND NOT ls."isTestSchool"
        AND NOT ls."inactive"
    JOIN static_lwp_period slp ON slp."isCurrentPeriod"
        AND slp."index" = lsc."periodIndex"
    JOIN static_lwp_year_group slyg ON slyg.id = lsc."yearGroup"
GROUP BY
    ROLLUP (slyg."shortName")