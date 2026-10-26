select
  case
    when base.ls_id is null then 'ALL'
    else max(base.school_name)
  end as school,
  count(distinct base.lpf_id) filter (where base.lpf_user_type = 'PARENT') as num_parent_log_entries,
  count(distinct base.lpf_id) filter (where base.lpf_user_type = 'TEACHER') as num_teacher_log_entries,
  count (distinct base.lpt_id) filter (where base.lpt_reading_target > 0 and base.lpt_release_date < now() - interval '1 week') as num_finished_pupil_weeks_with_targets,
  (
    sum(case when base.lpt_rn = 1 then base.lpt_reading_target else 0 end) /
    nullif(count(distinct base.lpt_id) filter (where base.lpt_reading_target > 0), 0)
  ) as average_weekly_reading_target,
  ((
    (count (distinct base.lpt_id) filter (where base.lpt_earned_gold_star and base.lpt_reading_target > 0 and base.lpt_release_date < now() - interval '1 week')) * 100.0 /
    nullif(count (distinct base.lpt_id) filter (where base.lpt_reading_target > 0 and base.lpt_release_date < now() - interval '1 week'), 0)
  )::integer)::text || '%' as percentage_targets_hit,
  case
    when base.ls_id is null then
      ((
        (count(distinct base.ls_id) filter (where base.ls_parent_feedback_enabled)) * 100.0 /
        count(distinct base.ls_id)
      )::integer)::text || '%'
    else
      (case when bool_or(base.ls_parent_feedback_enabled) then 'Yes' else 'No' end)
  end as teacher_replies_enabled,
  count(distinct base.lfr_id) as num_replies_by_teachers
from (
  select
    ls.id as ls_id,
    ls."schoolName" as school_name,
    ls."isParentFeedbackReplyFeatureEnabled" as ls_parent_feedback_enabled,
    lpt.id as lpt_id,
    lpt."readingTarget" as lpt_reading_target,
    lpt."releaseDate" as lpt_release_date,
    lpt."earnedGoldStar" as lpt_earned_gold_star,
    lpf.id as lpf_id,
    lpf."userType" as lpf_user_type,
    lfr.id as lfr_id,
    row_number() over (partition by lpt.id order by lpt.id) as lpt_rn
  from
    static_lwp_school_tag slst
    join static_lwp_period slp on slp."isCurrentPeriod"
    join lwp_school_static_tags llst on llst."tagId" = slst.id
    join lwp_school ls on ls.id = llst."schoolId" and not ls."isTestSchool"
    join lwp_pupil lp on lp."schoolId" = ls.id
    join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp."status" in ('ACTIVE', 'INVITED')
    join lwp_pupil_topic lpt on lpt."pupilId" = lp.id and lpt."periodIndex" = slp.index
    left join lwp_pupil_feedback_history lpfh on lpfh."lwpPupilId" = lp.id
    left join lwp_pupil_feedback lpf on lpf.id = lpfh."lwpPupilFeedbackId" and lpf."periodIndex" = slp.index
    left join lwp_feedback_reply lfr on lfr."feedbackId" = lpf.id
  where slst.name = 'Little Wandle Pilot'
) base
group by rollup(base.ls_id)
