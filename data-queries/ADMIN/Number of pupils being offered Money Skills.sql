
-- Number of pupils being offered Money Skills
-- Count of pupils assigned at least one Money Skills topic in the current period

SELECT 
    count(distinct lp.id) as "All pupils count",
    count(distinct lp.id) filter(where lp."isPremium" = true) as "Premium pupils count",
    count(distinct lp.id) filter(where lp."isPremium" is not true ) as "Non Premium pupils count"
FROM lwp_pupil lp
join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp.status in ('INVITED', 'ACTIVE')
join lwp_school ls on ls.id = lp."schoolId"
join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = ls."curentPeriodIndex"
join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" is false
join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" 
join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
join static_lwp_subject sls on sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS' 
WHERE 
    NOT ls."isTestSchool"
    AND NOT ls."inactive"