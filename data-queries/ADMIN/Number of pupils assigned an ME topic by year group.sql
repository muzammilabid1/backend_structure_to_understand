select
   slyg."year" as "Year group",
   count(distinct lp."id") as "Pupils offered a Maths or English topic this year"
from static_lwp_subject sls
join static_lwp_topic_domain sltd on sltd."subjectId" = sls."id"
join static_lwp_topic_domain_year_group sltdy on sltdy."domainId" = sltd."id"
join static_lwp_topic slt on slt."id" = sltdy."topicId" and not slt."isHidden"
join static_lwp_period slp on slp."isCurrentPeriod"
join lwp_pupil_topic lpt on lpt."topicId" = slt."id" and lpt."periodIndex" = slp."index"
join lwp_pupil lp on lp."id" = lpt."pupilId"
join lwp_class_pupil lcp on lcp."lwpPupilId" = lp."id"
join lwp_school_class lsc on lsc."id" = lcp."lwpSchoolClassId"
join static_lwp_year_group slyg on slyg."id" = lsc."yearGroup"
join lwp_school ls on ls."id" = lp."schoolId" and not ls."isTestSchool"
where sls."name" in ('English', 'Maths')
group by slyg."id", slyg."year"
order by case slyg."year"
   when 'Preschool' then -1
   when 'Reception' then 0
   when 'Unknown' then 99
   else slyg."id"
end;
