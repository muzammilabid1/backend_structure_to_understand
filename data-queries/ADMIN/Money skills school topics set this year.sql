select
  ls.id as school_id,
  ls."schoolName" as school_name,
  string_agg(distinct slst.name, ', ') filter (where slst.name ilike '%SPM%') as spm_tag,
  count(distinct lsc.id) as classes_with_money_skills,
  count(distinct lct.id) as num_topics_set,
  min(lct."logCreatedAt")::date as date_scheduled_ms
from
  static_lwp_subject sls
  join static_lwp_topic_domain sltd on sltd."subjectId" = sls.id
  join static_lwp_topic_domain_year_group sltdy on sltdy."domainId" = sltd.id
  join static_lwp_topic slt on sltdy."topicId" = slt.id
  join lwp_class_topic lct on lct."topicId" = slt.id
  join lwp_school_class lsc on lsc.id = lct."classId"
  join lwp_school ls on ls.id = lsc."schoolId" and not ls."isTestSchool"
  join static_lwp_period slp on slp.index = lsc."periodIndex"
  left join lwp_school_static_tags lsst on lsst."schoolId" = ls.id
  left join static_lwp_school_tag slst on slst.id = lsst."tagId"
where sls.name = 'Money Skills' and slp."isCurrentPeriod"
group by ls.id, ls."schoolName";