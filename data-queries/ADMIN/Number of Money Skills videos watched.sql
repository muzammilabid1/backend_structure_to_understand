-- Number of videos watched

SELECT 
    count(distinct lpt.id) FILTER (WHERE lpt."watchedVideo" = true) AS "Number of videos watched by all pupils",
    calculate_percentage(
	 	count(distinct lpt.id)::int,
        count(distinct lpt.id) FILTER (WHERE lpt."watchedVideo" = true)::int
    ) AS "Percentage of videos watched by all pupils",

    count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true and lpt."watchedVideo" = true) AS "Number of videos watched by premium pupils",
    calculate_percentage(
	 	count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true)::int,
        count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true and lpt."watchedVideo" = true)::int
    ) AS "Percentage of videos watched by premium pupils",
    
    count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true and lpt."watchedVideo" = true) AS "Number of videos watched by non premium pupils",
    calculate_percentage(
	 	count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true)::int,
        count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true and lpt."watchedVideo" = true)::int
    ) AS "Percentage of videos watched by non premium pupils"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" >= ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" 
join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
join static_lwp_subject sls on sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS' 
WHERE 
    NOT ls."isTestSchool"
    AND NOT ls."inactive"
    AND slt.video IS NOT NULL
