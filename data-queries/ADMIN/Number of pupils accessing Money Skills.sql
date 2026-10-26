
-- Number of pupils accessing Money Skills
-- Count of pupils who have watched at least one Money Skills video in the current period

with number_of_pupils_offered_money_skills as (
	SELECT 
	    count(distinct lp.id) filter(where lpt."watchedVideo" = true AND lp."isPremium" = true) as "premium_pupils_egaged_with_ms",
	    count(distinct lp.id) filter(where lpt."watchedVideo" = true AND lp."isPremium" is not true ) as "non_premium_pupils_egaged_with_ms",
		count(distinct lp.id) filter(where lp."isPremium" = true) as "premium_pupils_offered_ms",
		count(distinct lp.id) filter(where lp."isPremium" is not true ) as "non_premium_pupils_offered_ms"
	FROM lwp_pupil lp
	join lwp_school ls on ls.id = lp."schoolId"
	join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex"
	join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
	join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" 
	join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
	join static_lwp_subject sls on sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS' 
	WHERE 
	    NOT ls."isTestSchool"
	    AND NOT ls."inactive"
	    AND slt.video is not null
)

select 
	 sum(premium_pupils_egaged_with_ms+non_premium_pupils_egaged_with_ms) as "Number of all pupils accessing MS",
	 premium_pupils_egaged_with_ms as "Number of premium pupils accessing MS",
	 non_premium_pupils_egaged_with_ms as "Number of non premium pupils accessing MS",
	 calculate_percentage(
		(premium_pupils_offered_ms + non_premium_pupils_offered_ms)::int,
	 	(premium_pupils_egaged_with_ms + non_premium_pupils_egaged_with_ms)::int
	) AS "Percentage of all pupils accessing MS",
	 calculate_percentage(
	 	premium_pupils_offered_ms::int,
        premium_pupils_egaged_with_ms::int
    ) AS "Percentage of premium pupils accessing MS",
	 calculate_percentage(
	 	non_premium_pupils_offered_ms::int,
        non_premium_pupils_egaged_with_ms::int
    ) AS "Percentage of non premium pupils accessing MS"
from number_of_pupils_offered_money_skills
group by 
	premium_pupils_egaged_with_ms, 
	non_premium_pupils_egaged_with_ms, 
	premium_pupils_offered_ms, 
	non_premium_pupils_offered_ms