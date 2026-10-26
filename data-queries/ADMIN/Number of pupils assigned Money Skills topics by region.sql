select
    coalesce(ls.region, 'Unknown') as "Region",
    count(distinct(lp.id)) as "Num pupils assigned a topic this A/Y",
    count(distinct(lp.id)) filter (where lp."isPremium") as "Num Pupil Premium pupils assigned a topic this A/Y"
from lwp_pupil_topic lpt
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" 
join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
join static_lwp_subject sls on sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS'
join lwp_pupil lp on lp.id = lpt."pupilId"
join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status in ('INVITED', 'ACTIVE')
join lwp_school ls on ls.id = lp."schoolId" and not ls."isTestSchool" and not ls."inactive"
where lpt."periodIndex" >= ls."curentPeriodIndex"
group by ls.region;