SELECT
    *
FROM
    crosstab ('SELECT
    slt."teacherTopicName"::varchar,
	string_agg(DISTINCT slyg."shortName", '', ''),
    concat(''https://explore.learningwithparents.com/admin/topic/'', slt.id) as "Topic URL",
    trim(to_char(lct."releaseDate", ''Month'')),
    count(1)::int
FROM
    lwp_class_topic lct
    JOIN static_lwp_topic slt ON slt.id = lct."topicId"
	JOIN lwp_topic_year_groups ltyg ON ltyg."staticLwpTopicId" = slt.id
    JOIN static_lwp_year_group slyg ON slyg.id = ltyg."staticLwpYearGroupId"
WHERE slt."isReading" = false
GROUP BY
    slt.id,
    to_char(lct."releaseDate", ''Month'')
ORDER BY 1', 'SELECT unnest(ARRAY[''January'', ''February'', ''March'', ''April'', ''May'', ''June'', ''July'', ''August'', ''September'', ''October'', ''November'', ''December''])') AS ct (
		"Topic name" varchar,
		"Year groups for topic" varchar,
        "Topic URL" varchar,
        "January" int,
        "February" int,
        "March" int,
        "April" int,
        "May" int,
        "June" int,
        "July" int,
        "August" int,
        "September" int,
        "October" int,
        "November" int,
        "December" int);