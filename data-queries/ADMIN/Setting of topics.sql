WITH mainQuery AS (
    SELECT
        slt."teacherTopicName",
        string_agg(DISTINCT slyg."shortName", ', '),
        concat('https://explore.learningwithparents.com/admin/topic/', slt.id),
        count(1) FILTER (WHERE lsc."periodIndex" = 2022) AS timesSet22,
        count(1) FILTER (WHERE lsc."periodIndex" = 2023) AS timesSet23
    FROM
        static_lwp_topic slt
        JOIN lwp_class_topic lct ON lct."topicId" = slt.id
        JOIN lwp_topic_year_groups ltyg ON ltyg."staticLwpTopicId" = slt.id
        JOIN static_lwp_year_group slyg ON slyg.id = ltyg."staticLwpYearGroupId"
        JOIN lwp_school_class lsc ON lsc.id = lct."classId"
    GROUP BY
        slt.id
)
SELECT
    '-- Cross-site average --' AS "Topic name",
    'N/A' AS "Year groups for topic",
    'N/A' AS "Link to topic",
    avg(timesSet22) AS "# times set in 2022",
    avg(timesSet23) AS "# times set in 2023"
FROM
    mainQuery
UNION ALL
SELECT
    *
FROM
    mainQuery