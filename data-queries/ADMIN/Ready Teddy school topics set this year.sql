select
  ls.id as school_id,
  ls."schoolName" as school_name,
  string_agg(distinct slst.name, ', ') filter (where slst.name ilike '%SPM%') as spm_tag,
  count(distinct lsc.id) as classes_with_ready_teddy,
  count(distinct lct.id) as total_ready_teddy_topics_set,
  count(distinct lct.id) filter (where lct."releaseDate" >= slp."startDate") as rt_topics_set_this_year
from
  lwp_school_class lsc
  join lwp_school ls on ls.id = lsc."schoolId"
    and not ls."isTestSchool"
    and not ls.inactive
  join static_lwp_period slp on slp.index = lsc."periodIndex"
  left join lwp_class_topic lct on lct."classId" = lsc.id
    and exists (
      select 1
      from static_lwp_topic slt
      join static_lwp_topic_domain_year_group sltdy on sltdy."topicId" = slt.id
      join static_lwp_topic_domain sltd on sltd.id = sltdy."domainId"
      join static_lwp_subject sls on sls.id = sltd."subjectId"
      where slt.id = lct."topicId" and sls.name = 'Ready Teddy'
    )
  left join lwp_school_static_tags lsst on lsst."schoolId" = ls.id
  left join static_lwp_school_tag slst on slst.id = lsst."tagId"
where lsc."isReadyTeddyEnabled" and slp."isCurrentPeriod"
group by ls.id, ls."schoolName";
