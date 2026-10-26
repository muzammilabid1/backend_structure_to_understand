WITH ordered_static_activities AS (
    SELECT
        *,
        row_number() OVER (PARTITION BY "topicId" ORDER BY "order") AS "activityOrder"
    FROM
        static_lwp_activity
	WHERE
		NOT "isHidden"
)
SELECT
	CASE WHEN lpt."periodIndex" IS NULL THEN '2022 and beyond' ELSE lpt."periodIndex"::text END AS "Academic year",
    slt."teacherTopicName" AS "Topic name",
    STRING_AGG(DISTINCT(sls."name"), ', ') AS "Subject name(s)",
    STRING_AGG(DISTINCT(sltd."title"), ', ') AS "Domain name(s)",
    STRING_AGG(DISTINCT(slyg."year"), ', ') AS "Year group(s)",
    count(DISTINCT ls.id) AS "Num schools that set topic",
    count(DISTINCT lpt."pupilId") AS "Num pupils been set topic",
    count(DISTINCT lpt."pupilId") FILTER (WHERE lp."isPremium") AS "Num PP pupils been set topic",
    count(DISTINCT lpt."pupilId") FILTER (WHERE is1.english_as_additional_language) AS "Num EAL pupils been set topic",
    count(DISTINCT lpt."pupilId") FILTER (WHERE is1.sen_status IS NOT NULL AND is1.sen_status NOT IN ('N', 'N,', '')) AS "Num SEND pupils been set topic",
    count(DISTINCT sla.id) AS "Num distinct non-hidden activities in this topic",
    count(DISTINCT lppa."userId") AS "Num logged topic page accesses from distinct users",
    (count(DISTINCT lppa."pupilId") / count(DISTINCT lpt.id)::float) * 100 AS "% of pupils who logged accesses",
    count(DISTINCT lpt."pupilId") FILTER (WHERE lpt."watchedVideo") AS "Num watched video",
    CASE WHEN count(DISTINCT lpt."pupilId") = 0 THEN
        0
    ELSE
        (count(DISTINCT lpt."pupilId") FILTER (WHERE lpt."watchedVideo") / count(DISTINCT lpt."pupilId")::float) * 100
    END AS "% of pupils who watched video",
    count(DISTINCT lpt."pupilId") FILTER (WHERE activities_completed.stars = 0) AS "0 activities completed where set",
    count(DISTINCT lpt."pupilId") FILTER (WHERE activities_completed.stars = 1) AS "1 activity completed where set",
    count(DISTINCT lpt."pupilId") FILTER (WHERE activities_completed.stars = 2) AS "2 activities completed where set",
    count(DISTINCT lpt."pupilId") FILTER (WHERE activities_completed.stars = 3) AS "3 activities completed where set",
    count(DISTINCT lpt."pupilId") FILTER (WHERE lpt."earnedGoldStar") AS "Num who have completed the topic",
    count(DISTINCT lpt."pupilId") FILTER (WHERE lp."isPremium" AND lpt."earnedGoldStar") AS "Num PP who have completed the topic",
    count(DISTINCT lpt."pupilId") FILTER (WHERE is1.english_as_additional_language AND lpt."earnedGoldStar") AS "Num EAL who have completed the topic",
    count(DISTINCT lpt."pupilId") FILTER (WHERE is1.sen_status IS NOT NULL AND is1.sen_status NOT IN ('N', 'N,', '') AND lpt."earnedGoldStar") AS "Num SEND who have completed the topic",
    CASE WHEN count(DISTINCT lpt."pupilId") = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa."pupilId") FILTER (WHERE lpa."activityId" = firstActivity.id
                AND lpa."earnedStar") / count(DISTINCT lpt."pupilId")::float) * 100
    END AS "% of pupils who completed the first activity",
    CASE WHEN count(DISTINCT lpt."pupilId") = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa."pupilId") FILTER (WHERE lpa."activityId" = secondActivity.id
                AND lpa."earnedStar") / count(DISTINCT lpt."pupilId")::float) * 100
    END AS "% of pupils who completed the second activity",
    CASE WHEN count(DISTINCT lpt."pupilId") = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa."pupilId") FILTER (WHERE lpa."activityId" = thirdActivity.id
                AND lpa."earnedStar") / count(DISTINCT lpt."pupilId")::float) * 100
    END AS "% of pupils who completed the third activity",
    CASE WHEN count(DISTINCT lpt."pupilId") = 0 THEN
        0
    ELSE
        (count(DISTINCT lpt."pupilId") FILTER (WHERE lpt."earnedGoldStar")
        	/ count(DISTINCT lpt."pupilId")::float) * 100
    END AS "% of pupils who completed the topic",
    CASE WHEN (count(DISTINCT lpt."pupilId") FILTER (WHERE lp."isPremium")) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpt."pupilId") FILTER (WHERE lp."isPremium" and lpt."earnedGoldStar")
        	/ (count(DISTINCT lpt."pupilId") FILTER (WHERE lp."isPremium"))::float) * 100
    END AS "% of PP pupils who completed the topic",
    CASE WHEN (count(DISTINCT lpt."pupilId") FILTER (WHERE is1.english_as_additional_language)) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpt."pupilId") FILTER (WHERE is1.english_as_additional_language AND lpt."earnedGoldStar")
        	/ (count(DISTINCT lpt."pupilId") FILTER (WHERE is1.english_as_additional_language))::float) * 100
    END AS "% of EAL pupils who completed the topic",
    CASE WHEN (count(DISTINCT lpt."pupilId") FILTER (WHERE is1.sen_status IS NOT NULL AND is1.sen_status NOT IN ('N', 'N,', ''))) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpt."pupilId") FILTER (WHERE is1.sen_status IS NOT NULL AND is1.sen_status NOT IN ('N', 'N,', '') and lpt."earnedGoldStar")
        	/ (count(DISTINCT lpt."pupilId") FILTER (WHERE is1.sen_status IS NOT NULL AND is1.sen_status NOT IN ('N', 'N,', '')))::float) * 100
    END AS "% of SEND pupils who completed the topic"
FROM
    static_lwp_topic slt
    JOIN static_lwp_topic_domain_year_group sltdyg ON sltdyg."topicId" = slt.id
    JOIN static_lwp_topic_domain sltd ON sltd.id = sltdyg."domainId"
    JOIN static_lwp_subject sls ON sls.id = sltd."subjectId"
    JOIN static_lwp_year_group slyg ON slyg.id = sltdyg."yearGroupId"
    JOIN static_lwp_activity sla ON sla."topicId" = slt.id
        AND NOT sla."isHidden"
    JOIN lwp_pupil_topic lpt ON lpt."topicId" = slt.id
    JOIN lwp_pupil lp ON lp.id = lpt."pupilId"
    JOIN lwp_school ls ON ls.id = lp."schoolId" AND NOT ls."isTestSchool"
    LEFT JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
    LEFT JOIN lwp_school_class lsc ON lsc.id = lct."classId"
    LEFT JOIN imported_student is1 ON is1.id = lp."importedStudentId"
    LEFT JOIN (
        SELECT
            lpa."topicId",
            count(1) FILTER (WHERE lpa."earnedStar") AS "stars"
        FROM
            lwp_pupil_activity lpa
        GROUP BY
            lpa."topicId") activities_completed ON activities_completed."topicId" = lpt.id
    LEFT JOIN ordered_static_activities firstActivity ON firstActivity."topicId" = slt.id
        AND firstActivity."activityOrder" = 1
    LEFT JOIN ordered_static_activities secondActivity ON secondActivity."topicId" = slt.id
        AND secondActivity."activityOrder" = 2
    LEFT JOIN ordered_static_activities thirdActivity ON thirdActivity."topicId" = slt.id
        AND thirdActivity."activityOrder" = 3
    LEFT JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
    LEFT JOIN lwp_view_parent_pupil_action_stats lppa ON lppa."actionId" = 6
        AND lppa."param2" = lpt.id
WHERE
    NOT slt."isHidden"
    AND lpt."periodIndex" >= 2022
GROUP BY
    ROLLUP(lpt."periodIndex"),
    slt.id
;