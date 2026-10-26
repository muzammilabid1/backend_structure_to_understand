-- Number of English videos watched
-- Total number of English videos watched, broken down by PP/non-PP

with english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'English'
)
SELECT
    count(distinct lpt.id) AS "Number of videos watched by all pupils",
    count(distinct lpt.id) FILTER (WHERE lp."isPremium" = true) AS "Number of videos watched by pupil premium",
    count(distinct lpt.id) FILTER (WHERE lp."isPremium" is not true) AS "Number of videos watched by non pupil premium"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
join english_topics et on et.topic_id = slt.id
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive"
    AND slt.video IS NOT NULL
	AND lpt."watchedVideo" = true
