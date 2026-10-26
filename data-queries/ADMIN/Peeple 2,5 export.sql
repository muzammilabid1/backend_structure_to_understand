/**
 * Addresses hypotheses:
 * Engagement will be higher with children aged 0-2 than 2-5
 * Videos using a voiceover will keep parents’ attention longer than those with a presenter.
 */
SELECT
    ls."schoolName" AS "Setting name",
    lsc."name" AS "Class name",
    concat(lp.firstname, ' ', lp.lastname) AS "Pupil name",
    age(CURRENT_DATE, is2."dateOfBirth")::VARCHAR AS "Age",
    string_agg(DISTINCT concat(lu.firstname, ' ', lu.lastname), '; ') AS "Active parents (semicolon-separated)",
    count(DISTINCT lpt.id) AS "Number of released pupil topics",
    count(DISTINCT lpt.id) FILTER (WHERE lpt."watchedVideo") AS "Number of videos watched",
    count(DISTINCT lpa.id) AS "Number of activities opened",
    count(DISTINCT lpt.id) FILTER (WHERE lpt."earnedGoldStar") AS "Number of pupil topics completed"
FROM
    lwp_school_class lsc
    JOIN lwp_school ls ON ls.id = lsc."schoolId"
        AND NOT ls."isTestSchool"
    JOIN lwp_school_static_tags lsst ON lsst."schoolId" = ls.id
    JOIN static_lwp_school_tag slst ON slst.id = lsst."tagId"
        AND slst."name" = 'Peep'
    JOIN lwp_class_pupil lcp ON lcp."lwpSchoolClassId" = lsc.id
    JOIN lwp_pupil lp ON lp.id = lcp."lwpPupilId"
    LEFT JOIN lwp_pupil_parent lpp ON lpp."pupilId" = lp.id
        AND lpp.status = 'ACTIVE'
    LEFT JOIN lwp_user lu ON lu.id = lpp."parentId"
    LEFT JOIN imported_student is2 ON is2."lwpPupilId" = lp.id
    JOIN lwp_class_topic lct ON lct."classId" = lsc.id
    LEFT JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id
        AND lpt."classTopicId" = lct.id
    LEFT JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
        AND lpa."logFirstAccessed" IS NOT NULL
WHERE
    lsc."periodIndex" = ls."curentPeriodIndex"
    AND lsc."isRegistrationClass"
GROUP BY
    ls.id,
    lsc.id,
    lp.id,
    is2.id
