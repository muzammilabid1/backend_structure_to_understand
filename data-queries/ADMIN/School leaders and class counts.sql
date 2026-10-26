SELECT
    lu.firstname,
    lu.lastname,
    lu."nameForChildren",
    lu.email,
    ls."schoolName" AS "School name",
    count(DISTINCT lsc.id) FILTER (WHERE lsc."IsReadingLogsEnabled"
        AND NOT lsc."isFullProgramme") AS "Number of RL-only classes",
    count(DISTINCT lsc.id) FILTER (WHERE NOT lsc."IsReadingLogsEnabled"
        AND lsc."isFullProgramme") AS "Number of FP-only classes",
    count(DISTINCT lsc.id) FILTER (WHERE lsc."IsReadingLogsEnabled"
        AND lsc."isFullProgramme") AS "Number of both FP and RL classes",
    count(DISTINCT lsc.id) FILTER (WHERE lsc."status" = 'ACTIVE') AS "Total number of ACTIVE classes",
    count(DISTINCT lsc.id) AS "Total number of classes in any status",
    string_agg(DISTINCT slst.name, ', ') AS "schoolTags"
FROM
    lwp_school ls
    LEFT JOIN lwp_school_static_tags lsst ON lsst."schoolId" = ls.id
    LEFT JOIN static_lwp_school_tag slst ON slst.id = lsst."tagId"
    JOIN lwp_school_class lsc ON lsc."schoolId" = ls.id
        AND lsc."isRegistrationClass"
    JOIN static_lwp_period slp ON slp."isCurrentPeriod"
        AND slp.index = ls."curentPeriodIndex"
        AND slp.index = lsc."periodIndex"
    JOIN lwp_user lu ON lu."schoolId" = ls.id
        AND lu."isSchoolLeader"
        AND lu."userStatus" = 'ACTIVE'
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive"
GROUP BY
    lu.id,
    ls."schoolName"
;
