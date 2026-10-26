-- Total number of English activities completed
-- Total number of English activities engaged with, leaving either a photo or a comment

with english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'English'
)
SELECT
    count(distinct lpa.id) as "Number of English activities completed"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
JOIN english_topics et ON et.topic_id = slt.id
JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id and lpa."earnedStar" = true
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive"
