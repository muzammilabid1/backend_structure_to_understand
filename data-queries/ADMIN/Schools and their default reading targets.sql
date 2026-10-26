select * from crosstab('SELECT
    ls."schoolName" as "School name",
    lsc."readingTarget" as "Reading target",
    count(distinct lsc.id) as "Number of classes"
FROM
    lwp_school ls
	JOIN static_lwp_period slp ON ls."curentPeriodIndex" = slp.index AND slp."isCurrentPeriod"
    JOIN lwp_school_class lsc
		ON lsc."schoolId" = ls.id
		AND lsc."isRegistrationClass"
		AND lsc."periodIndex" = ls."curentPeriodIndex"
WHERE
    NOT ls.inactive
    AND NOT ls."isTestSchool"
	AND lsc."IsReadingLogsEnabled"
GROUP BY
    ls.id,
    lsc."readingTarget"
ORDER BY 1', 'SELECT generate_series(0,7);') as (
	"School name" varchar,
	"0" int,
	"1" int,
	"2" int,
	"3" int,
	"4" int,
	"5" int,
	"6" int,
	"7" int
);