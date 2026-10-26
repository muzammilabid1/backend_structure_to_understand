SELECT
    "yearGroup" AS "Year group",
    (
        CASE WHEN "atHome" IS TRUE THEN
            'Reading at home'
        WHEN "atHome" IS FALSE THEN
			'Reading at school'
		ELSE
			'Total across home and school'
        END) AS "Place of reading",
    avg("count") AS "Average num reading log entries per pupil per week"
FROM (
    SELECT
        lsc."yearGroup",
        lpf."userType" IN ('PARENT', 'TOPICACCESS') AS "atHome",
        count(DISTINCT lpf.id)
    FROM
        lwp_school_class lsc
        JOIN lwp_school ls ON lsc."schoolId" = ls.id
            AND NOT ls."isTestSchool"
        JOIN lwp_class_topic lct ON lct."classId" = lsc.id
        JOIN static_lwp_topic slt ON slt.id = lct."topicId"
            AND slt."isReading" = true
        JOIN lwp_class_pupil lcp ON lsc.id = lcp."lwpSchoolClassId"
        JOIN lwp_pupil_topic lpt ON lpt."classTopicId" = lct.id
            AND lcp."lwpPupilId" = lpt."pupilId"
        JOIN lwp_pupil_feedback_history lpfh ON lpt."pupilId" = lpfh."lwpPupilId"
        JOIN lwp_pupil_feedback lpf ON lpfh."lwpPupilFeedbackId" = lpf.id
            AND daterange(lpt."releaseDate", (lpt."releaseDate" + '7 days'::interval)::date) @> coalesce(lpf."bookReadAt"::timestamp WITHOUT time zone, lpf."logCreatedAt")::date
    WHERE
        lsc."periodIndex" = 2023
    GROUP BY
        lsc."yearGroup",
        lpf."userType" IN ('PARENT', 'TOPICACCESS'),
        lpt.id) iQ
GROUP BY
    "yearGroup",
    ROLLUP ("atHome");