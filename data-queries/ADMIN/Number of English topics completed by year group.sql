-- Breakdown by year group
-- Number of English topics completed by year group

with english_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'English'
)
select
	slyg.year as "Year",
	count(distinct lpt.id) as "Number of topic completed by all pupils",
	count(distinct lpt.id) filter (where lp."isPremium" = true) as "Number of topic completed by pupil premium",
	count(distinct lpt.id) filter (where lp."isPremium" is not true) as "Number of topic completed by non pupil premium"
from lwp_school ls
join lwp_school_class lsc on lsc."schoolId" = ls.id and lsc."periodIndex" = ls."curentPeriodIndex"
join static_lwp_year_group slyg on slyg.id = lsc."yearGroup"
join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id
join lwp_pupil lp on lp.id = lcp."lwpPupilId"
join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex" and lpt."earnedGoldStar" = true
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join english_topics et on et.topic_id = slt.id
where
	NOT ls."isTestSchool"
    AND NOT ls."inactive"
group by slyg.id
order by slyg.year;
