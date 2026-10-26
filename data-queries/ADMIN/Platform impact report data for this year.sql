-- Platform-wide impact report totals
-- Returns a single row of headline engagement figures across the whole platform.
-- Excludes test schools and inactive schools.
--
-- Definitions:
--   * activity completed        -> lwp_pupil_activity.earnedStar = true (all programmes:
--                                  Maths, English, Money Skills, Ready Teddy; reading
--                                  topics have no activity records)
--   * reading session logged    -> lwp_pupil_feedback.type = 'READING', logged at home
--                                  (userType in 'PARENT'/'TOPICACCESS'), originals only
--   * audio / photo             -> lwp_pupil_feedback_media.type in ('AUDIO','PHOTO')
--   * pupil/parent comment      -> userType in ('PARENT','TOPICACCESS') and any comment set
--   * teacher comment           -> userType = 'TEACHER' and comment is not null
--   * registered class          -> lwp_school_class.isRegistrationClass, ACTIVE, on the
--                                  current period of its school
--   * registered teacher        -> lwp_user type 'TEACHER' with userStatus 'ACTIVE'
--   * countable parent          -> lwp_user of a parent-side type ('PARENT','TOPICACCESS')
--                                  at a userStatus that can sign in ('ACTIVE','ACCOUNTLESS',
--                                  'INVITED'). Used for the parent and the pupil headcounts
--                                  alike, so the two reconcile.
--   * registered parent         -> countable parent with an ACTIVE link to a cohort pupil
--   * pupil invited             -> cohort pupil with a countable parent link at INVITED or
--                                  ACTIVE
--   * pupil registered          -> cohort pupil with a countable parent link at ACTIVE
--   * PP / non-PP               -> Pupil Premium, held on lwp_pupil.isPremium (the "Pupil
--                                  premium" field on the add-pupil form): is true / is not
--                                  true. The column is nullable because the form offers an
--                                  explicit "unknown", so unknowns fold into non-PP and the
--                                  two splits always add up to the total. Always report
--                                  Pupil Premium here, never FSM.
--
-- Two pupil scopes, deliberately - lwp_pupil_parent has no period column:
--   * Cohort-scoped (this year's ACTIVE registration classes): classes, parents
--     registered, pupils invited, pupils registered.
--   * Platform-scoped (all pupils at active schools): every other column.
--     Teachers registered has no period filter at all.
-- The two groups are not nested denominators.

-- Each fact table is aggregated per pupil first, then joined 1:1 (no fan-out).
with active_schools as (
	select id, "curentPeriodIndex"
	from lwp_school
	where
		not inactive
		and not "isTestSchool"
),
scoped_pupils as (
	select lp.id as pupil_id, ls."curentPeriodIndex" as period_index, lp."isPremium" as is_premium
	from active_schools ls
	join lwp_pupil lp on lp."schoolId" = ls.id
),
-- This year's registration classes, and the pupils on them: the denominator for the
-- headcounts that have no period-stamped fact table of their own.
registration_classes as (
	select lsc.id, lsc."schoolId"
	from active_schools ls
	join lwp_school_class lsc
		on lsc."schoolId" = ls.id
		and lsc."isRegistrationClass"
		and lsc."periodIndex" >= ls."curentPeriodIndex"
		and lsc."status" = 'ACTIVE'
),
registration_cohort as (
	select distinct lp.id as pupil_id, lp."isPremium" as is_premium
	from registration_classes rc
	join lwp_class_pupil lcp on lcp."lwpSchoolClassId" = rc.id
	join lwp_pupil lp on lp.id = lcp."lwpPupilId" and lp."schoolId" = rc."schoolId"
),
class_counts as (
	select count(*) as classes_registered
	from registration_classes
),
teacher_counts as (
	select count(distinct lu.id) as teachers_registered
	from active_schools ls
	join lwp_user lu
		on lu."schoolId" = ls.id
		and lu."type" = 'TEACHER'
		and lu."userStatus" = 'ACTIVE'
),
-- One definition of a countable parent link, used by the parent and pupil headcounts
-- alike so the two reconcile: a parent-side user who can sign in, linked to a cohort pupil.
cohort_parent_links as (
	select
		rc.pupil_id,
		rc.is_premium,
		lpp."parentId" as parent_id,
		lpp."status" as link_status
	from registration_cohort rc
	join lwp_pupil_parent lpp on lpp."pupilId" = rc.pupil_id
	join lwp_user lu on lu.id = lpp."parentId"
		and lu."type" in ('PARENT', 'TOPICACCESS')
		and lu."userStatus" in ('ACTIVE', 'ACCOUNTLESS', 'INVITED')
),
-- A parent counts as PP if any of their children in the cohort is PP. Resolved per parent
-- before counting, so a parent with both a PP and a non-PP child lands in one bucket only
-- and the two splits still sum to the total.
parent_premium as (
	select
		parent_id,
		bool_or(is_premium is true) as is_premium
	from cohort_parent_links
	where link_status = 'ACTIVE'
	group by parent_id
),
parent_counts as (
	select
		count(*) as parents_registered,
		count(*) filter (where is_premium) as parents_registered_pp,
		count(*) filter (where not is_premium) as parents_registered_non_pp
	from parent_premium
),
-- Invited vs registered per cohort pupil. IMPORTED (loaded from the MIS but never invited)
-- and REJECTED (invited, then declined) are excluded from both.
pupil_link_status as (
	select
		pupil_id,
		is_premium,
		bool_or(link_status in ('INVITED', 'ACTIVE')) as invited,
		bool_or(link_status = 'ACTIVE') as registered
	from cohort_parent_links
	group by pupil_id, is_premium
),
cohort_counts as (
	select
		count(*) filter (where invited) as pupils_invited,
		count(*) filter (where invited and is_premium) as pupils_invited_pp,
		count(*) filter (where invited and is_premium is not true) as pupils_invited_non_pp,
		count(*) filter (where registered) as pupils_registered,
		count(*) filter (where registered and is_premium) as pupils_registered_pp,
		count(*) filter (where registered and is_premium is not true) as pupils_registered_non_pp
	from pupil_link_status
),
-- Count of completed (earned-star) activities per pupil, on non-reading topics in scope.
pupil_activity_stats as (
	select
		sp.pupil_id,
		count(lpa.id) as completed_activities
	from scoped_pupils sp
	join lwp_pupil_topic lpt
		on lpt."pupilId" = sp.pupil_id
		and lpt."periodIndex" >= sp.period_index
	join static_lwp_topic slt on slt.id = lpt."topicId" and slt."isReading" = false
	join lwp_pupil_activity lpa on lpa."topicId" = lpt.id
		and lpa."earnedStar" = true
	group by sp.pupil_id
),
-- Pupils who logged reading at home this period.
pupils_logged_home_reading as (
	select distinct sp.pupil_id
	from scoped_pupils sp
	join lwp_pupil_feedback_history lpfh on lpfh."lwpPupilId" = sp.pupil_id
	join lwp_pupil_feedback lpf on
		lpf.id = lpfh."lwpPupilFeedbackId"
		and lpf."periodIndex" = sp.period_index
		and lpf.type = 'READING'
		and lpf."userType" in ('PARENT', 'TOPICACCESS')
		and lpf."originalFeedbackId" is null
),
-- One feedback scan (period >= current, originals) for media, comments and reading sessions.
feedback_stats as (
	select
		count(distinct lpf.id) filter (
			where lpf."periodIndex" = sp.period_index
				and lpf."userType" in ('PARENT', 'TOPICACCESS')
				and lpf.type = 'READING'
		) as reading_sessions_logged_at_home,
		count(distinct lpfm.id) filter (where lpfm."type" = 'AUDIO') as audio_recordings,
		count(distinct lpfm.id) filter (where lpfm."type" = 'PHOTO') as photos_uploaded,
		count(distinct lpf.id) filter (
			where lpf."userType" in ('PARENT', 'TOPICACCESS')
				and (lpf."pupilComment" is not null or lpf."parentComment" is not null or lpf."comment" is not null)
		) as comments_from_pupils_and_parents,
		count(distinct lpf.id) filter (
			where lpf."userType" = 'TEACHER' and lpf."comment" is not null
		) as comments_from_teachers
	from scoped_pupils sp
	join lwp_pupil_feedback_history lpfh on lpfh."lwpPupilId" = sp.pupil_id
	join lwp_pupil_feedback lpf on
		lpf.id = lpfh."lwpPupilFeedbackId"
		and lpf."periodIndex" >= sp.period_index
		and lpf."originalFeedbackId" is null
	left join lwp_pupil_feedback_media lpfm on lpfm."feedbackId" = lpf.id
),
-- Join the per-pupil summaries 1:1 for the activity total and engagement counts.
engagement as (
	select
		coalesce(sum(pas.completed_activities), 0) as activities_completed,
		count(distinct pas.pupil_id) filter (where pas.completed_activities > 0) as pupils_completed_activities,
		count(distinct pas.pupil_id) filter (where pas.completed_activities > 0 and sp.is_premium) as pupils_completed_activities_pp,
		count(distinct pas.pupil_id) filter (where pas.completed_activities > 0 and sp.is_premium is not true) as pupils_completed_activities_non_pp,
		count(distinct pr.pupil_id) filter (where pr.pupil_id is not null) as pupils_logged_reading,
		count(distinct pr.pupil_id) filter (where pr.pupil_id is not null and sp.is_premium) as pupils_logged_reading_pp,
		count(distinct pr.pupil_id) filter (where pr.pupil_id is not null and sp.is_premium is not true) as pupils_logged_reading_non_pp,
		count(distinct sp.pupil_id) filter (where pas.completed_activities > 0 or pr.pupil_id is not null) as pupils_active_any,
		count(distinct sp.pupil_id) filter (where (pas.completed_activities > 0 or pr.pupil_id is not null) and sp.is_premium) as pupils_active_any_pp,
		count(distinct sp.pupil_id) filter (where (pas.completed_activities > 0 or pr.pupil_id is not null) and sp.is_premium is not true) as pupils_active_any_non_pp
	from scoped_pupils sp
	left join pupil_activity_stats pas on pas.pupil_id = sp.pupil_id
	left join pupils_logged_home_reading pr on pr.pupil_id = sp.pupil_id
)
select
	e.activities_completed as "Total activities completed (all programmes)",
	f.reading_sessions_logged_at_home as "Total reading sessions logged (home)",
	f.audio_recordings as "Total audio recordings",
	f.photos_uploaded as "Total photos uploaded",
	f.comments_from_pupils_and_parents as "Total comments from pupils and parents",
	f.comments_from_teachers as "Total comments from teachers",

	c.classes_registered as "Number of classes registered",
	t.teachers_registered as "Number of teachers registered",

	p.parents_registered as "Total parents registered",
	p.parents_registered_pp as "Total parents registered (PP)",
	p.parents_registered_non_pp as "Total parents registered (non-PP)",

	cc.pupils_invited as "Total pupils invited",
	cc.pupils_invited_pp as "Total pupils invited (PP)",
	cc.pupils_invited_non_pp as "Total pupils invited (non-PP)",

	cc.pupils_registered as "Total pupils registered",
	cc.pupils_registered_pp as "Total pupils registered (PP)",
	cc.pupils_registered_non_pp as "Total pupils registered (non-PP)",

	e.pupils_active_any as "Total pupils who used the platform (activity or home reading)",
	e.pupils_active_any_pp as "Total pupils who used the platform (PP)",
	e.pupils_active_any_non_pp as "Total pupils who used the platform (non-PP)",

	e.pupils_logged_reading as "Total pupils who recorded a reading entry (home)",
	e.pupils_logged_reading_pp as "Total pupils who recorded a reading entry (home) (PP)",
	e.pupils_logged_reading_non_pp as "Total pupils who recorded a reading entry (home) (non-PP)",

	e.pupils_completed_activities as "Total pupils who completed an activity",
	e.pupils_completed_activities_pp as "Total pupils who completed an activity (PP)",
	e.pupils_completed_activities_non_pp as "Total pupils who completed an activity (non-PP)"
from engagement e, feedback_stats f, class_counts c, teacher_counts t, parent_counts p, cohort_counts cc
