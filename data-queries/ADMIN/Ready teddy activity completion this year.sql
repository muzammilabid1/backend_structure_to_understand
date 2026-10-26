select
  sla.id as activity_id,
  slt."teacherTopicName" as topic_name,
  sla.name as activity_name,
  sla.order as order,
  count(distinct lpa.id) as assigned,
  count(distinct lpa.id) filter (where lpp.status = 'ACTIVE') as assigned_and_pupil_active,
  -- for record of parent *opening the page*, the fields on lpa are unreliable, so use lppa
  count(distinct lpa.id) filter (where lppa.id is not null) as accessed,
  count(distinct lpa.id) filter (where lpa."earnedStar") as completed,
  count(distinct lpf.id) filter (where lpf.id is not null) as num_entries
from
  static_lwp_subject sls
  join static_lwp_topic_domain sltd on sltd."subjectId" = sls.id
  join static_lwp_topic_domain_year_group sltdy on sltdy."domainId" = sltd.id
  join static_lwp_topic slt on sltdy."topicId" = slt.id
  join static_lwp_activity sla on sla."topicId" = slt.id
  join lwp_pupil_activity lpa on lpa."activityId" = sla.id
  join lwp_pupil_topic lpt on lpa."topicId" = lpt.id
  join lwp_pupil lp on lp.id = lpa."pupilId"
  join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp."status" in ('ACTIVE', 'INVITED')
  join lwp_school ls on ls.id = lp."schoolId" and not ls."isTestSchool"
  join static_lwp_period slp on slp.index = lpt."periodIndex"
  left join lwp_pupil_feedback lpf on lpf."activityId" = lpa.id
  left join lwp_view_parent_pupil_action_stats lppa on lppa."actionId" = 10 and lppa."param2" = lpa.id
where sls.name = 'Ready Teddy' and slp."isCurrentPeriod"
group by slt.id,sla.id
order by slt.id, sla.order
