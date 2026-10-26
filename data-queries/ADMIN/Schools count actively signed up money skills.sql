SELECT 
    COUNT(distinct ls.id) AS "Schools count signed up Money Skills"
FROM lwp_school ls
JOIN lwp_school_class lsc ON 
    lsc."schoolId" = ls.id
    AND lsc."periodIndex" = ls."curentPeriodIndex"
JOIN lwp_class_topic lct ON lct."classId" = lsc.id
JOIN static_lwp_topic slt ON slt.id = lct."topicId" AND slt."isReading" = false
JOIN static_lwp_topic_domain_year_group sltdyg ON slt."id" = sltdyg."topicId" 
JOIN static_lwp_topic_domain sltd ON sltdyg."domainId" = sltd."id"
JOIN static_lwp_subject sls ON sltd."subjectId" = sls."id" AND sls."programmeType" = 'MONEY_SKILLS' 
WHERE 
	NOT ls."isTestSchool"
    AND NOT ls."inactive"
    AND ls."isMoneySkillsAvailable" = true;
