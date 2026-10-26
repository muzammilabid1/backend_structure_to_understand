-- Number of children engaging with English programme
-- Total number of children who have completed at least one English activity during the reporting period
-- Total number of children who have completed at least two English activities during the reporting period
-- Total number of children who have completed at least three English activities during the reporting period
-- Total number of children who have completed at least four English activities during the reporting period
-- Total number of children who have completed at least five English activities during the reporting period

with english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'English'
),
pupils_with_english_engagement as (
    SELECT
        lp.id as pupil_id,
        lp."isPremium" as is_premium,
        count(distinct lpa.id) as  number_of_activities_completed
    FROM lwp_pupil lp
    join lwp_school ls on ls.id = lp."schoolId"
    join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex"
    join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
    join english_topics et on et.topic_id = slt.id
    join lwp_pupil_activity lpa on lpa."topicId" = lpt.id and lpa."earnedStar"
    WHERE
       	NOT ls."isTestSchool"
    	AND NOT ls."inactive"
    group by lp.id
)
select
	-- Completed at least 1 activity
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 1) AS "Number of pupils completed 1 activity",
	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 1) AS "Number of non pupil premium completed 1 activity",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 1) AS "Number of pupil premium completed 1 activity",

    -- Completed at least 2 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 2) AS "Number of pupils completed 2 activities",
	COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 2) AS "Number of non pupil premium completed 2 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 2) AS "Number of pupil premium completed 2 activities",

    -- Completed at least 3 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 3) AS "Number of pupils completed 3 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 3) AS "Number of non pupil premium completed 3 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 3) AS "Number of pupil premium completed 3 activities",

    -- Completed at least 4 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 4) AS "Number of pupils completed 4 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 4) AS "Number of non pupil premium completed 4 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 4) AS "Number of pupil premium completed 4 activities",

    -- Completed at least 5 activities
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.number_of_activities_completed >= 5) AS "Number of pupils completed 5 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium is not true AND b.number_of_activities_completed >= 5) AS "Number of non pupil premium completed 5 activities",
    COUNT(DISTINCT b.pupil_id) FILTER (WHERE b.is_premium = TRUE AND b.number_of_activities_completed >= 5) AS "Number of pupil premium completed 5 activities"
FROM pupils_with_english_engagement b
