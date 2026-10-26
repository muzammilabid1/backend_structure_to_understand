
-- Number and percentage of Money Skills activities completed (earnedStar = true)

SELECT
    count(distinct lpa.id) FILTER (WHERE lpa."earnedStar" = true) AS "Number of MS activities completed",
    calculate_percentage(
	 	count(distinct lpa.id)::int,
        count(distinct lpa.id) FILTER (WHERE lpa."earnedStar" = true)::int
    ) AS "Percentage of MS activities completed"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
JOIN static_lwp_topic_domain_year_group sltdyg ON slt."id" = sltdyg."topicId" 
JOIN static_lwp_topic_domain sltd ON sltdyg."domainId" = sltd."id"
JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS'
JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id
WHERE 
    NOT ls."isTestSchool"
    AND NOT ls."inactive"
