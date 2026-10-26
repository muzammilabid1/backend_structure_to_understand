select
  a.name as activity,
  t."teacherTopicName" as topic,
  td.title as domain,
  sls.name as subject,
  a.id as activity_id,
  a."isHidden" as hidden,
  a.resources,
  string_agg(tag.name, ', ') as tags,
  'https://explore.learningwithparents.com/admin/activity/' || a.id::text as admin_link
from static_lwp_activity a
join static_lwp_topic t on a."topicId" = t.id
left join static_lwp_topic_domain_year_group dt on dt."topicId" = t.id
left join static_lwp_topic_domain td on td.id = dt."domainId"
left join static_lwp_subject sls on td."subjectId" = sls.id
left join lwp_activity_tags a_t on a_t."staticLwpActivityId" = a.id
left join static_lwp_activity_tag tag on a_t."staticLwpActivityTagId" = tag.id
group by a.id, t.id, td.id, sls.name
order by sls.name, t.id, a.order
