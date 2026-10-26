SELECT
    day_name AS "Day",
    count(1) AS "All logged reading",
    count(1) FILTER (WHERE at_home) AS "Reading at home",
    count(1) FILTER (WHERE NOT at_home) AS "Reading at school"
FROM (
    SELECT
        to_char(lpf."logCreatedAt", 'ID') AS day_of_week,
        to_char(lpf."logCreatedAt", 'Day') AS day_name,
        lpf."userType" = ANY ('{PARENT,TOPICACCESS,MAGICPARENT}') AS at_home
    FROM
        lwp_pupil_feedback lpf
    WHERE 
    	lpf.type = 'READING'
	) innerQuery
GROUP BY
    day_of_week,
    day_name
ORDER BY
    day_of_week ASC;