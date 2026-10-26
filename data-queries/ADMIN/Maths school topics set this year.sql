with maths_topics as (
    select sltdyg."topicId" as topic_id
    from static_lwp_topic_domain_year_group sltdyg
    join static_lwp_topic_domain sltd on sltd.id = sltdyg."domainId"
    join static_lwp_subject sls on sls.id = sltd."subjectId"
    group by sltdyg."topicId"
    having count(distinct sls.id) = 1 and max(sls.name) = 'Maths'
)
select
  ls.id as school_id,
  ls."schoolName" as school_name,
  count(distinct lsc.id) as classes_with_maths,
  count(distinct lct.id) as num_topics_set
from
  maths_topics mt
  join lwp_class_topic lct on lct."topicId" = mt.topic_id
  join lwp_school_class lsc on lsc.id = lct."classId"
  join lwp_school ls on ls.id = lsc."schoolId" and not ls."isTestSchool"
  join static_lwp_period slp on slp.index = lsc."periodIndex"
where slp."isCurrentPeriod"
group by ls.id;