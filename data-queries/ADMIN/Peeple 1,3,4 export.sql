/**
 * Addresses hypotheses:
 * Parents who are part of a Peep group will record more interactions at home than those who are part of a Stay and Play
 * Where practitioners are more confident with technology, they will engage more with the platform
 * Where practitioners engage more with the platform, parents will record more interactions at home
 * Parents who attend more sessions will record more interactions at home
 */
SELECT
    ls."schoolName" AS "Setting name",
    lsc."name" AS "Class name",
    count(distinct lcp."lwpPupilId") AS "Class size",
    max(concat(lu_main_teacher.firstname, ' ', lu_main_teacher.lastname)) AS "Main teacher name",
    count(DISTINCT lll.id) AS "Number of main teacher logins",
    count(DISTINCT lct.id) AS "Number of class topics released",
    count(DISTINCT lpt.id) AS "Number of videos watched",
    count(DISTINCT lpa.id) AS "Number of activities opened",
    count(DISTINCT lpt.id) FILTER (WHERE lpt."earnedGoldStar") AS "Number of pupil topics completed",
    count(DISTINCT lpp."pupilId") FILTER (WHERE lpp."status" = 'ACTIVE') AS "Number of pupils with at least one ACTIVE parent"
FROM
    lwp_school_class lsc
    LEFT JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
    JOIN lwp_school ls ON ls.id = lsc."schoolId"
        AND NOT ls."isTestSchool"
    JOIN lwp_school_static_tags lsst ON lsst."schoolId" = ls.id
    JOIN static_lwp_school_tag slst ON slst.id = lsst."tagId"
        AND slst."name" = 'Peep'
    JOIN lwp_user lu_main_teacher ON lu_main_teacher.id = lsc."mainTeacherId"
    LEFT JOIN log_lwp_login lll ON lll."result" = 'SUCCESS'
        AND lll."userEmail" = lu_main_teacher.email
    JOIN lwp_class_topic lct ON lct.released
        AND lct."classId" = lsc.id
    LEFT JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = lct.id
        AND lpt."watchedVideo" AND lpt."pupilId" = lcp."lwpPupilId"
    LEFT JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
        AND lpa."logFirstAccessed" IS NOT NULL AND lpt."pupilId" = lcp."lwpPupilId"
    LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lpt."pupilId"
WHERE
    lsc."periodIndex" = ls."curentPeriodIndex"
GROUP BY
    ls.id,
    lsc.id
