SELECT
    COUNT(DISTINCT lp."id") AS total_pupils,
    COUNT(DISTINCT lp."id") FILTER (WHERE lp."isPremium" = true) AS pp_pupils,
    COUNT(DISTINCT lp."id") FILTER (WHERE lp."isPremium" is not true) AS nonpp_pupils
FROM lwp_school ls
join lwp_pupil lp on lp."schoolId" = ls.id
join lwp_pupil_feedback_history lpfh ON lpfh."lwpPupilId" = lp.id
join lwp_pupil_feedback lpf on 
	lpf.id = lpfh."lwpPupilFeedbackId" 
	and lpf.type = 'SCRAPBOOK' 
	and lpf."periodIndex" >= ls."curentPeriodIndex" 
where 
	not ls.inactive
	and not ls."isTestSchool"