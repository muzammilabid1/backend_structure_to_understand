-- Total number of unique Maths and English topics completed

with subject_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) in ('Maths', 'English')
)
select
	count(distinct lpt.id) as "Number of topic completed by all pupils",
	count(distinct lpt.id) filter (where lp."isPremium" = true) as "Number of topic completed by pupil premium",
	count(distinct lpt.id) filter (where lp."isPremium" is not true) as "Number of topic completed by non pupil premium"
FROM lwp_pupil lp
JOIN lwp_school ls ON ls.id = lp."schoolId"
JOIN lwp_pupil_topic lpt ON lpt."pupilId" = lp.id AND lpt."periodIndex" = ls."curentPeriodIndex" and lpt."earnedGoldStar" = true
JOIN static_lwp_topic slt ON slt.id = lpt."topicId" AND slt."isReading" IS FALSE
join subject_topics st on st.topic_id = slt.id
where
	NOT ls."isTestSchool"
    AND NOT ls."inactive"
