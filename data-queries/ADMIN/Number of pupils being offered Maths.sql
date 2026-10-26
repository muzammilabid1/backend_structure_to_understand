-- Number of children being offered Maths
-- Total number of children who have been sent at least one Maths topic

with maths_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'Maths'
)
SELECT
    count(distinct lp.id) as "All pupils count",
    count(distinct lp.id) filter(where lp."isPremium" = true) as "Pupil premium count",
    count(distinct lp.id) filter(where lp."isPremium" is not true ) as "Non pupil premium count"
FROM lwp_pupil lp
join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status in ('INVITED', 'ACTIVE')
join lwp_school ls on ls.id = lp."schoolId"
join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex"
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join maths_topics mt on mt.topic_id = slt.id
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive";
