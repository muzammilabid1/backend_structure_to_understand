-- Geographical breakdown

with english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'English'
)
select
    coalesce(ls.region, 'Unknown') as "Region",
    count(distinct(lp.id)) as "Num of pupils assigned a topic this A/Y",
    count(distinct(lp.id)) filter (where lp."isPremium") as "Num of pupil premium assigned a topic this A/Y",
	count(distinct(lp.id)) filter (where lp."isPremium" is not true) as "Num non pupil premium assigned a topic this A/Y"
from lwp_pupil_topic lpt
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join english_topics et on et.topic_id = slt.id
join lwp_pupil lp on lp.id = lpt."pupilId"
join lwp_school ls on ls.id = lp."schoolId" and not ls."isTestSchool" and not ls."inactive"
where lpt."periodIndex" = ls."curentPeriodIndex"
group by ls.region
order by ls.region;
