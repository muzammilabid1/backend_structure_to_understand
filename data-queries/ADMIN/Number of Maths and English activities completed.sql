-- Breakdown by pupil premium status
-- Number of Maths and English activities completed

with subject_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) in ('Maths', 'English')
)
SELECT
    count(distinct lpa.id) as "Number of M&E activities completed by all pupils",
    count(distinct lpa.id) filter (where lp."isPremium" = true) as "Completed by pupil premium pupils",
    count(distinct lpa.id) filter (where lp."isPremium" is not true) as "Completed by non-pupil premium pupils"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
JOIN subject_topics st ON st.topic_id = slt.id
JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id and lpa."earnedStar" = true
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive";

