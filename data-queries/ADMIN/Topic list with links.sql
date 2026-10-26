select "teacherTopicName", "parentTopicName", year,STRING_AGG(DISTINCT sls."name", '; ') AS subjects, concat('https://explore.learningwithparents.com/admin/topic/', slt.id::text) as link 
from static_lwp_topic slt 
left join static_lwp_topic_domain_year_group sltdyg on slt."id" = sltdyg."topicId" and slt."isReading" is false
left join static_lwp_topic_domain sltd on sltdyg."domainId" = sltd."id"
left join static_lwp_subject sls on sltd."subjectId" = sls."id"

group by slt.id