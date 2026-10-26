-- Total number of Maths activities completed with pp

with maths_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'Maths'
)
SELECT
    count(distinct lpa.id) as "Number of Maths activities completed",
    count(distinct lpa.id) filter (where lp."isPremium" = true) as "Number of Maths activities completed by Pupil Premium",
    count(distinct lpa.id) filter (where lp."isPremium" is not true) as "Number of Maths activities completed by Non Pupil Premium"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex"
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
JOIN maths_topics mt ON mt.topic_id = slt.id
JOIN lwp_pupil_activity lpa ON lpa."topicId" = lpt.id and lpa."earnedStar" = true
WHERE
    NOT ls."isTestSchool"
    AND NOT ls."inactive";
