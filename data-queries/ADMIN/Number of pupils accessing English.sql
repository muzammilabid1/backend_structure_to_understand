-- Number of children accessing English programme
-- Total number of children who have watched at least one English video

with english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'English'
)
SELECT
	count(distinct lp.id) as "All pupils count",
	count(distinct lp.id) filter(where lp."isPremium" = true) as "Number of pupil premium accessing English",
	count(distinct lp.id) filter(where lp."isPremium" is not true ) as "Number of non pupil premium accessing English"
FROM lwp_pupil lp
join lwp_school ls on ls.id = lp."schoolId"
join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex"
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join english_topics et on et.topic_id = slt.id
WHERE
	NOT ls."isTestSchool"
	AND NOT ls."inactive"
	AND slt.video is not null
	AND lpt."watchedVideo" = true
