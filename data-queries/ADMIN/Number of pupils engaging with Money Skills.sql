with pupils_with_money_skills_engagement as (
    SELECT 
        lp.id as pupil_id,
        lp."isPremium" as is_premium,
        count(distinct lpt.id) filter (where lpt."earnedGoldStar") number_of_topics_completed,
        count(distinct lpa.id) filter (where lpa."earnedStar") number_of_activities_completed
    FROM lwp_pupil lp
    join lwp_school ls on ls.id = lp."schoolId"
    join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex"
    join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
    join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" 
    join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
    join static_lwp_subject sls on sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS'
    join lwp_pupil_activity lpa on lpa."topicId" = lpt.id
    WHERE 
       	NOT ls."isTestSchool"
    	AND NOT ls."inactive"
    group by lp.id
)
select 
	-- Completed at least 1 activity
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 1) AS "Number of pupils completed 1 activity",
	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 1) AS "Number of non premium pupils completed 1 activity",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 1) AS "Number of premium pupils completed 1 activity",
	
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 1)::int
    ) AS "Percentage of all pupils completed 1 activity",
	
    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 1)::int
    ) AS "Percentage of non premium pupils completed 1 activity",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 1)::int
    ) AS "Percentage of premium pupils completed 1 activity",
    
    -- Completed at least 2 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 2) AS "Number of pupils completed 2 activities",
	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 2) AS "Number of non premium pupils completed 2 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 2) AS "Number of premium pupils completed 2 activities",
    
    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 2)::int
    ) AS "Percentage of all pupils completed 2 activities",

    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 2)::int
    ) AS "Percentage of non premium pupils completed 2 activities",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 2)::int
    ) AS "Percentage of premium pupils completed 2 activities",
    
    -- Completed at least 3 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 3) AS "Number of pupils completed 3 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 3) AS "Number of non premium pupils completed 3 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 3) AS "Number of premium pupils completed 3 activities",

    calculate_percentage(
     	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 3)::int
    ) AS "Percentage of all pupils completed 3 activities",

    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 3)::int
    ) AS "Percentage of non premium pupils completed 3 activities",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 3)::int
    ) AS "Percentage of premium pupils completed 3 activities",
    
    -- Completed at least 4 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 4) AS "Number of pupils completed 4 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 4) AS "Number of non premium pupils completed 4 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 4) AS "Number of premium pupils completed 4 activities",

    calculate_percentage(
     	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 4)::int
    ) AS "Percentage of all pupils completed 4 activities",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 4)::int
    ) AS "Percentage of non premium pupils completed 4 activities",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 4)::int
    ) AS "Percentage of premium pupils completed 4 activities",
    
    -- Completed at least 5 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 5) AS "Number of pupils completed 5 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 5) AS "Number of non premium pupils completed 5 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 5) AS "Number of premium pupils completed 5 activities",
    
    calculate_percentage(
     	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 5)::int
    ) AS "Percentage of all pupils completed 5 activities",

    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 5)::int
    ) AS "Percentage of non premium pupils completed 5 activities",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 5)::int
    ) AS "Percentage of premium pupils completed 5 activities",
    
    -- Completed at least 1 topic
    calculate_percentage(
     	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_topics_completed >= 1)::int
    ) AS "Percentage of all pupils completed 1 topic",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_topics_completed >= 1)::int
    ) AS "Percentage of non premium pupils completed 1 topic",
	
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_topics_completed >= 1)::int
    ) AS "Percentage of premium pupils completed 1 topic",
    
    -- Completed at least 2 topics
    calculate_percentage(
     	COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_topics_completed >= 2)::int
    ) AS "Percentage of all pupils completed 2 topics",

	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_topics_completed >= 2)::int
    ) AS "Percentage of non premium pupils completed 2 topics",
	
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_topics_completed >= 2)::int
    ) AS "Percentage of premium pupils completed 2 topics",
    
    -- Completed at least 3 topics
    calculate_percentage(
        COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_topics_completed >= 3)::int
    ) AS "Percentage of all pupils completed 3 topics",

    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_topics_completed >= 3)::int
    ) AS "Percentage of non premium pupils completed 3 topics",
	
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_topics_completed >= 3)::int
    ) AS "Percentage of premium pupils completed 3 topics",
    
    -- Completed at least 4 topics
    calculate_percentage(
        COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_topics_completed >= 4)::int
    ) AS "Percentage of all pupils completed 4 topics",

    calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_topics_completed >= 4)::int
    ) AS "Percentage of non premium pupils completed 4 topics",
	
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_topics_completed >= 4)::int
    ) AS "Percentage of premium pupils completed 4 topics",
    
    -- Completed at least 5 topics
    calculate_percentage(
        COUNT(DISTINCT b.pupil_id)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_topics_completed >= 5)::int
    ) AS "Percentage of all pupils completed 5 topics",
    
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_topics_completed >= 5)::int
    ) AS "Percentage of non premium pupils completed 5 topics",
	
	calculate_percentage(
	 	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE)::int,
        COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_topics_completed >= 5)::int
    ) AS "Percentage of premium pupils completed 5 topics"
FROM pupils_with_money_skills_engagement b