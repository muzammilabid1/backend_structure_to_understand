SELECT 
    count(*) as "Schools count signed up Money Skills"
FROM lwp_school ls
WHERE 
	NOT ls."isTestSchool"
    AND NOT ls."inactive"
    AND ls."isMoneySkillsAvailable" = true;
