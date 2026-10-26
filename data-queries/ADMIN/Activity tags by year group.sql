SELECT
    slt.name AS "Tag name",
    count(DISTINCT sla.id) AS "Num activities in tag",
    -- Reception
    count(DISTINCT lpa.id) FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Num times set to pupils in R",
    avg(lpa.rating) FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Avg rating in R",
    count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Number of times set it's been accessed in R",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND lsc."yearGroup"::int4 = 55) AS "Number of times set that it's been completed in R",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND lsc."yearGroup"::int4 = 55) / (count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55))::float) * 100
    END AS "% completion after starting in R",
    -- Year 1 and 2
    count(DISTINCT lpa.id) FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y1-2",
    avg(lpa.rating) FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y1-2",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y1-2",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y1-2",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(1, 2, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y1-2",
    -- Year 3 and 4
    count(DISTINCT lpa.id) FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y3-4",
    avg(lpa.rating) FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y3-4",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y3-4",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y3-4",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(3, 4, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y3-4",
    -- Year 5 and 6
    count(DISTINCT lpa.id) FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y5-6",
    avg(lpa.rating) FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y5-6",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y5-6",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y5-6",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(5, 6, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y5-6"
FROM
    static_lwp_activity sla
    JOIN lwp_activity_tags lat ON lat."staticLwpActivityId" = sla.id
    JOIN static_lwp_activity_tag slt ON slt.id = lat."staticLwpActivityTagId"
    JOIN lwp_pupil_activity lpa ON lpa."activityId" = sla.id
    JOIN lwp_pupil_topic lpt ON lpt.id = lpa."topicId"
    JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
    JOIN lwp_school_class lsc ON lsc.id = lct."classId"
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
    -- Reception
    count(DISTINCT lpa.id) FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Num times set to pupils in R",
    avg(lpa.rating) FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Avg rating in R",
    count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Number of times set it's been accessed in R",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND lsc."yearGroup"::int4 = 55) AS "Number of times set that it's been completed in R",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND lsc."yearGroup"::int4 = 55) / (count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55))::float) * 100
    END AS "% completion after starting in R",
    -- Year 1 and 2
    count(DISTINCT lpa.id) FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y1-2",
    avg(lpa.rating) FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y1-2",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y1-2",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y1-2",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(1, 2, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y1-2",
    -- Year 3 and 4
    count(DISTINCT lpa.id) FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y3-4",
    avg(lpa.rating) FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y3-4",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y3-4",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y3-4",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(3, 4, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y3-4",
    -- Year 5 and 6
    count(DISTINCT lpa.id) FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y5-6",
    avg(lpa.rating) FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y5-6",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y5-6",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y5-6",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(5, 6, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y5-6"
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
    JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
    JOIN lwp_school_class lsc ON lsc.id = lct."classId"
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
    -- Reception
    count(DISTINCT lpa.id) FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Num times set to pupils in R",
    avg(lpa.rating) FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Avg rating in R",
    count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55) AS "Number of times set it's been accessed in R",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND lsc."yearGroup"::int4 = 55) AS "Number of times set that it's been completed in R",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND lsc."yearGroup"::int4 = 55) / (count(DISTINCT lppa."param2") FILTER (WHERE lsc."yearGroup"::int4 = 55))::float) * 100
    END AS "% completion after starting in R",
    -- Year 1 and 2
    count(DISTINCT lpa.id) FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y1-2",
    avg(lpa.rating) FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y1-2",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y1-2",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(1, 2, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y1-2",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(1, 2, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(1, 2, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y1-2",
    -- Year 3 and 4
    count(DISTINCT lpa.id) FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y3-4",
    avg(lpa.rating) FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y3-4",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y3-4",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(3, 4, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y3-4",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(3, 4, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(3, 4, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y3-4",
    -- Year 5 and 6
    count(DISTINCT lpa.id) FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Num times set to pupils in Y5-6",
    avg(lpa.rating) FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Avg rating in Y5-6",
    count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Number of times set it's been accessed in Y5-6",
    count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
        AND int4range(5, 6, '[]') @> lsc."yearGroup"::int4) AS "Number of times set that it's been completed in Y5-6",
    CASE WHEN count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4) = 0 THEN
        0
    ELSE
        (count(DISTINCT lpa.id) FILTER (WHERE lpa."earnedStar"
                AND int4range(5, 6, '[]') @> lsc."yearGroup"::int4) / (count(DISTINCT lppa."param2") FILTER (WHERE int4range(5, 6, '[]') @> lsc."yearGroup"::int4))::float) * 100
    END AS "% completion after starting in Y5-6"
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
    JOIN lwp_class_topic lct ON lct.id = lpt."classTopicId"
    JOIN lwp_school_class lsc ON lsc.id = lct."classId"
    LEFT JOIN lwp_view_parent_pupil_action_stats lppa ON lppa."actionId" = 10
        AND lppa."param2" = lpa.id
WHERE
    lpt."periodIndex" >= 2022
    AND SLS.name = 'English'
GROUP BY
    slt.id