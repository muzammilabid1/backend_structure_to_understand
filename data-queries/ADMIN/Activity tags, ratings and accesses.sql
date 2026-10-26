SELECT
    slt.name AS "Tag name",
    count(DISTINCT sla.id) AS "Num activities in tag",
    count(DISTINCT lpa.id) AS "Num times set to pupils",
    avg(lpa.rating) AS "Avg rating",
    avg(lpa.rating) FILTER (WHERE lp."isPremium") AS "Avg PP rating",
    count(DISTINCT lppa."param2") AS "Number of times set it's been accessed",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar") AS "Number of times set that it's been completed",
    count(DISTINCT lppa."param2") FILTER (WHERE lp."isPremium") AS "Number of times set to PP pupils it's been accessed",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND lp."isPremium") AS "Number of times set to PP students that it's been completed",
    (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar") / nullif (count(DISTINCT lppa."param2"), 0)::float) * 100 AS "% completion after starting",
    (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
            AND lp."isPremium") / nullif (count(DISTINCT lppa."param2") FILTER (WHERE lp."isPremium"), 0)::float) * 100 AS "% completion after starting PP"
FROM
    static_lwp_activity sla
    JOIN lwp_activity_tags lat ON lat."staticLwpActivityId" = sla.id
    JOIN static_lwp_activity_tag slt ON slt.id = lat."staticLwpActivityTagId"
    JOIN lwp_pupil_activity lpa ON lpa."activityId" = sla.id
    JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
    JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
    LEFT JOIN lwp_view_parent_pupil_action_stats lppa ON lppa."actionId" = 10
        AND lppa."param2" = lpa.id
WHERE
    lpt."periodIndex" >= 2022
GROUP BY
    slt.id
UNION ALL
SELECT
    concat('Maths: ', slt.name) AS "Tag name",
    count(DISTINCT sla.id) AS "Num activities in tag",
    count(DISTINCT lpa.id) AS "Num times set to pupils",
    avg(lpa.rating) AS "Avg rating",
    avg(lpa.rating) FILTER (WHERE lp."isPremium") AS "Avg PP rating",
    count(DISTINCT lppa."param2") AS "Number of times set it's been accessed",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar") AS "Number of times set that it's been completed",
    count(DISTINCT lppa."param2") FILTER (WHERE lp."isPremium") AS "Number of times set to PP pupils it's been accessed",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND lp."isPremium") AS "Number of times set to PP students that it's been completed",
    (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar") / nullif (count(DISTINCT lppa."param2"), 0)::float) * 100 AS "% completion after starting",
    (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
            AND lp."isPremium") / nullif (count(DISTINCT lppa."param2") FILTER (WHERE lp."isPremium"), 0)::float) * 100 AS "% completion after starting PP"
FROM
    static_lwp_activity sla
    JOIN static_lwp_topic slto ON slto.id = sla."topicId"
	JOIN STATIC_LWP_TOPIC_DOMAIN_YEAR_GROUP SLTDY ON SLTDY."topicId" = SLTO.id
	JOIN STATIC_LWP_TOPIC_DOMAIN SLTD ON SLTD.id = SLTDY."domainId"
	JOIN STATIC_LWP_SUBJECT SLS ON SLS.id = SLTD."subjectId"
    JOIN lwp_activity_tags lat ON lat."staticLwpActivityId" = sla.id
    JOIN static_lwp_activity_tag slt ON slt.id = lat."staticLwpActivityTagId"
    JOIN lwp_pupil_activity lpa ON lpa."activityId" = sla.id
    JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
    JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
    LEFT JOIN lwp_view_parent_pupil_action_stats lppa ON lppa."actionId" = 10
        AND lppa."param2" = lpa.id
WHERE
    lpt."periodIndex" >= 2022
    AND SLS.name = 'Maths'
GROUP BY
    slt.id
UNION ALL
SELECT
    concat('English: ', slt.name) AS "Tag name",
    count(DISTINCT sla.id) AS "Num activities in tag",
    count(DISTINCT lpa.id) AS "Num times set to pupils",
    avg(lpa.rating) AS "Avg rating",
    avg(lpa.rating) FILTER (WHERE lp."isPremium") AS "Avg PP rating",
    count(DISTINCT lppa."param2") AS "Number of times set it's been accessed",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar") AS "Number of times set that it's been completed",
    count(DISTINCT lppa."param2") FILTER (WHERE lp."isPremium") AS "Number of times set to PP pupils it's been accessed",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND lp."isPremium") AS "Number of times set to PP students that it's been completed",
    (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar") / nullif (count(DISTINCT lppa."param2"), 0)::float) * 100 AS "% completion after starting",
    (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
            AND lp."isPremium") / nullif (count(DISTINCT lppa."param2") FILTER (WHERE lp."isPremium"), 0)::float) * 100 AS "% completion after starting PP"
FROM
    static_lwp_activity sla
    JOIN static_lwp_topic slto ON slto.id = sla."topicId"
	JOIN STATIC_LWP_TOPIC_DOMAIN_YEAR_GROUP SLTDY ON SLTDY."topicId" = SLTO.id
	JOIN STATIC_LWP_TOPIC_DOMAIN SLTD ON SLTD.id = SLTDY."domainId"
	JOIN STATIC_LWP_SUBJECT SLS ON SLS.id = SLTD."subjectId"
    JOIN lwp_activity_tags lat ON lat."staticLwpActivityId" = sla.id
    JOIN static_lwp_activity_tag slt ON slt.id = lat."staticLwpActivityTagId"
    JOIN lwp_pupil_activity lpa ON lpa."activityId" = sla.id
    JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
    JOIN lwp_pupil lp ON lp.id = lpa."pupilId"
    LEFT JOIN lwp_view_parent_pupil_action_stats lppa ON lppa."actionId" = 10
        AND lppa."param2" = lpa.id
WHERE
    lpt."periodIndex" >= 2022
    AND SLS.name = 'English'
GROUP BY
    slt.id
