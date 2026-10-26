-- This query calculates the number of Money Skills topics completed by Premium and Non-Premium pupils, grouped by year.

select 
	slyg.year as "Year",
	count(distinct lpt.id) as "Number of topic completed by all pupils",
	count(distinct lpt.id) filter (where lp."isPremium" = true) as "Number of topic completed by Premium pupils",
	count(distinct lpt.id) filter (where lp."isPremium" is not true) as "Number of topic completed by Non-Premium pupils"
from lwp_school ls
join lwp_school_class lsc on lsc."schoolId" = ls.id and lsc."periodIndex" >= ls."curentPeriodIndex"
join static_lwp_year_group slyg on slyg.id = lsc."yearGroup"
join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = lsc.id
join lwp_pupil lp on lp.id = lcp."lwpPupilId"
join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" >= ls."curentPeriodIndex" and lpt."earnedGoldStar" = true
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" 
join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
join static_lwp_subject sls on sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS'
where 
	NOT ls."isTestSchool"
    AND NOT ls."inactive"
group by slyg.id;