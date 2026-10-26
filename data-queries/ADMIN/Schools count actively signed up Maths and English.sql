-- Number of partner schools actively signed up to Maths and English
-- Total number of partner schools who have released at least one Maths or English topic

with subject_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) in ('Maths', 'English')
)
SELECT
    COUNT(distinct ls.id) AS "Schools count signed up Maths and English"
FROM lwp_school ls
JOIN lwp_school_class lsc ON
    lsc."schoolId" = ls.id
    AND lsc."periodIndex" = ls."curentPeriodIndex"
JOIN lwp_class_topic lct ON lct."classId" = lsc.id
JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
JOIN subject_topics st ON st.topic_id = slt.id
WHERE
	NOT ls."isTestSchool"
    AND NOT ls."inactive"
