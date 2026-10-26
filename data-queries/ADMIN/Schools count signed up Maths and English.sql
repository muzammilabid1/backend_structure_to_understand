-- Number of partner schools signed up to Maths and English (Full Programme)
-- Total number of partner schools who have signed up to the Full Programme (Maths and English), whether they have released any topics or not
-- Note: Full Programme covers both Maths and English, so this same count applies to the Maths, English, and Maths and English requests

select
	count(distinct ls.id) as "number of schools"
from lwp_school ls
join lwp_school_class lsc on lsc."schoolId" = ls.id and lsc."periodIndex" = ls."curentPeriodIndex"
where
	not ls.inactive
	and not ls."isTestSchool"
	and ls."numOfFullProgrammeClassesAllowed" > 0
	and lsc."isFullProgramme"
