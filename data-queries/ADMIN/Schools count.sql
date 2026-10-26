with schools as (
	select 
		ls.id,
		COALESCE(BOOL_OR(slst.name = 'Little Wandle Pilot'), false) AS has_little_wandle
	FROM lwp_school ls
  	LEFT JOIN lwp_school_static_tags lsst ON lsst."schoolId" = ls.id
  	LEFT JOIN static_lwp_school_tag slst ON slst.id = lsst."tagId"
  	WHERE NOT ls."isTestSchool"
		AND NOT ls."inactive"
  	GROUP BY ls.id
)
SELECT
	COUNT(*) AS "Total Partner Schools",
	COUNT(*) FILTER (WHERE has_little_wandle) AS "Partner Schools Little Wandle",
	COUNT(*) FILTER (WHERE NOT has_little_wandle) AS "Partner Schools Non Little Wandle"
FROM schools;
