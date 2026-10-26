SELECT
    sla.name as "Activity name",
    string_agg(slyg."shortName", ', ') as "Activity year groups",
    concat('https://explore.learningwithparents.com/admin/activity/', sla.id) AS "URL"
FROM
    static_lwp_activity sla
    JOIN static_lwp_topic slt ON slt.id = sla."topicId"
        AND NOT slt."isHidden"
    LEFT JOIN lwp_activity_tags lat ON lat."staticLwpActivityId" = sla.id
    left join lwp_topic_year_groups ltyg on ltyg."staticLwpTopicId" = slt.id
    left join static_lwp_year_group slyg on slyg.id = ltyg."staticLwpYearGroupId"
WHERE
    lat."staticLwpActivityTagId" IS NULL
    AND NOT sla."isHidden"
group by sla.id, slt.id