select
	ls.id as "schoolId",
	ls."schoolName",
	lpf."periodIndex" as "academicYearStarting",
	count(distinct lpf.id) as "totalReadingLogs",
	count(distinct lpf.id) filter (where lpf."readingType" = 'SOMETHING_ELSE') as "numberOfOtherReadingLogs",
	(count(distinct lpf.id) filter (where lpf."readingType" = 'SOMETHING_ELSE'))::real
		/ greatest(count(distinct lpf.id), 1)::real * 100.0 as "percentageOfOtherReading",
	(count(distinct lpf.id) filter (where lpf."readingType" = 'SOMETHING_ELSE' and lpf."bookReadAt" < '2024-11-12'))::real
		/ greatest(count(distinct lpf.id) filter (where lpf."bookReadAt" < '2024-11-12'), 1)::real * 100.0 as "percentageBeforeIconChange",
	(count(distinct lpf.id) filter (where lpf."readingType" = 'SOMETHING_ELSE' and lpf."bookReadAt" >= '2024-11-12'))::real
		/ greatest(count(distinct lpf.id) filter (where lpf."bookReadAt" >= '2024-11-12'), 1)::real * 100.0 as "percentageAfterIconChange"
from lwp_pupil_feedback lpf
join lwp_pupil_feedback_history lpfh
	on lpfh."lwpPupilFeedbackId" = lpf.id
join lwp_pupil lp
	on lp.id = lpfh."lwpPupilId"
join lwp_school ls
	on ls.id = lp."schoolId"
where not ls."isTestSchool"
	and not ls.inactive
	and lpf."type" = 'READING'
group by
	ls.id,
	lpf."periodIndex"
order by
	ls."schoolName" asc,
	lpf."periodIndex" desc
;
