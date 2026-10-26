-- Number of pupils who have opened Money Skills activities, split by premium and non-premium

with number_of_pupils_offered_money_skills as (
	SELECT 
		count(distinct lp.id) filter(where lp."isPremium" = true) as "premium_pupils_offered_ms",
		count(distinct lp.id) filter(where lp."isPremium" is not true ) as "non_premium_pupils_offered_ms",
		count(distinct lp.id) 
			filter(
				where lp."isPremium" = true 
				AND (lpa."logAccessedOnMobile" <> 0 or lpa."logAccessedOnDesktop" <> 0)
			) as "premium_pupil_clicked_ms_activity",
		count(distinct lp.id) 
			filter(
				where lp."isPremium" is not true 
				AND (lpa."logAccessedOnMobile" <> 0 or lpa."logAccessedOnDesktop" <> 0) 
			) as "non_premium_pupil_clicked_ms_activity"
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
)
select
	sum(premium_pupil_clicked_ms_activity + non_premium_pupil_clicked_ms_activity) as "Total number of pupils clicked on MS activity",
	premium_pupil_clicked_ms_activity as "Number of premium pupils clicked on MS activity",
	non_premium_pupil_clicked_ms_activity as "Number of non premium pupils clicked on MS activity",
		calculate_percentage(
        (premium_pupils_offered_ms + non_premium_pupils_offered_ms)::INT,
        (premium_pupil_clicked_ms_activity + non_premium_pupil_clicked_ms_activity)::INT
    ) AS "Percentage of all pupils clicked on MS activity",
 	calculate_percentage(
	 	premium_pupils_offered_ms::int,
        premium_pupil_clicked_ms_activity::int
    ) AS "Percentage of premium pupils clicked on MS activity",
	calculate_percentage(
	 	non_premium_pupils_offered_ms::int,
        non_premium_pupil_clicked_ms_activity::int
    ) AS "Percentage of non premium pupils clicked on MS activity"
from number_of_pupils_offered_money_skills
GROUP BY 
    premium_pupils_offered_ms, 
    non_premium_pupils_offered_ms,
    premium_pupil_clicked_ms_activity, 
    non_premium_pupil_clicked_ms_activity;
