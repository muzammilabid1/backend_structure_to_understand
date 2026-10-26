SELECT
    concat(lu.firstname, ' ', lu.lastname) AS "Name",
    lu.email AS "Email",
    ls."schoolName" AS "School",
    ls."isTestSchool" AS "Is test school?",
    lu."isSchoolLeader" AS "School leader?",
    CASE WHEN lu."isSchoolLeader" THEN
        count(DISTINCT lsc_all.id) FILTER (WHERE lsc_all."isFullProgramme")
    ELSE
        count(DISTINCT lsc_own.id) FILTER (WHERE lsc_own."isFullProgramme")
    END > 0 AS "Full programme?",
    CASE WHEN lu."isSchoolLeader" THEN
        count(DISTINCT lsc_all.id) FILTER (WHERE lsc_all."IsReadingLogsEnabled")
    ELSE
        count(DISTINCT lsc_own.id) FILTER (WHERE lsc_own."IsReadingLogsEnabled")
    END > 0 AS "Reading log?",
    CASE WHEN lu."isSchoolLeader" THEN
        FALSE
    ELSE
        count(DISTINCT lsc_own.id) FILTER (WHERE lsc_own."parentClassId" IS NULL) = 0 AND count(DISTINCT lsc_own.id) > 0
    END AS "Only teaches groups?",
    count(DISTINCT lsc_own.id) AS "Num of own classes/groups"
FROM
    lwp_user lu
    JOIN lwp_school ls ON ls.id = lu."schoolId"
        AND NOT ls.inactive
    JOIN lwp_school_class lsc_all ON lsc_all."schoolId" = ls.id
        AND lsc_all."periodIndex" = ls."curentPeriodIndex"
    LEFT JOIN lwp_class_teacher lct ON lct."lwpUserId" = lu.id
    LEFT JOIN lwp_school_class lsc_own ON lsc_own.id = lct."lwpSchoolClassId"
        AND lsc_own."periodIndex" = ls."curentPeriodIndex"
WHERE
    lu."userStatus" = 'ACTIVE'
GROUP BY
    lu.id,
    ls.id