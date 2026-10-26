select
  slt.id as topic_id,
  slt."teacherTopicName" as topic_name,
  count(distinct lpt.id) as assigned,
  count(distinct lpt.id) filter (where lpp.status = 'ACTIVE') as assigned_and_pupil_active,
  count(distinct lpt.id) filter (where lpt."logAccessedOnDesktop" > 0 or lpt."logAccessedOnMobile" > 0) as accessed,
  count(distinct lpt.id) filter (where lpt."watchedVideo") as watched_video,
  count(distinct lpt.id) filter (where lpt."silverStars" >= 1) as unlocked_activities,
  count(distinct lpt.id) filter (where lpt."earnedGoldStar") as did_1_or_more,
  count(distinct lpt.id) filter (where lpt."silverStars" >= 2) as did_2_or_more,
  count(distinct lpt.id) filter (where lpt."silverStars" >= 3) as did_3_or_more
from
  static_lwp_subject sls
  join static_lwp_topic_domain sltd on sltd."subjectId" = sls.id
  join static_lwp_topic_domain_year_group sltdy on sltdy."domainId" = sltd.id
  join static_lwp_topic slt on sltdy."topicId" = slt.id
  join lwp_pupil_topic lpt on lpt."topicId" = slt.id
  join lwp_pupil lp on lp.id = lpt."pupilId"
  join lwp_pupil_parent lpp on lpp."pupilId" = lp.id and lpp."status" in ('ACTIVE', 'INVITED')
  join lwp_school ls on ls.id = lp."schoolId" and not ls."isTestSchool"
  join static_lwp_period slp on slp.index = lpt."periodIndex"
where sls.name = 'Ready Teddy' and slp."isCurrentPeriod"
group by slt.id
